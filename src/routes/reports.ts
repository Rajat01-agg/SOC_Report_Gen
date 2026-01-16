import { Router } from 'express';
import { PDFGenerator } from '../pdf/generator.ts';
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const router = Router();
const pdfGenerator = new PDFGenerator();
const prisma = new PrismaClient();

// Ensure reports directory exists
const reportsDir = path.join(process.cwd(), 'reports');
if (!fs.existsSync(reportsDir)) {
  fs.mkdirSync(reportsDir, { recursive: true });
}

// ========== HEALTH CHECK ==========
router.get('/health', async (req, res) => {
  try {
    // Test database connection
    await prisma.$queryRaw`SELECT 1`;
    
    res.json({ 
      status: 'OK', 
      service: 'Reports API',
      database: 'Connected ✅',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'ERROR', 
      service: 'Reports API',
      database: 'Disconnected ❌',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });
  }
});

// ========== GENERATE REPORT ==========
router.post('/generate', async (req, res) => {
  try {
    const { executionId, findings, metadata } = req.body;

    // Basic validation
    if (!executionId) {
      return res.status(400).json({ 
        success: false, 
        error: 'executionId is required' 
      });
    }

    if (!findings || !Array.isArray(findings)) {
      return res.status(400).json({ 
        success: false, 
        error: 'findings must be an array' 
      });
    }

    console.log(`📊 Processing ${findings.length} findings for: ${executionId}`);

    // Check if report already exists
    const existingReport = await prisma.report.findUnique({
      where: { executionId },
    });

    if (existingReport) {
      return res.json({
        success: true,
        message: 'Report already exists',
        data: {
          reportId: existingReport.id,
          executionId: existingReport.executionId,
          pdfUrl: existingReport.pdfUrl,
          status: existingReport.status,
          createdAt: existingReport.createdAt,
        }
      });
    }

    // Analyze findings
    const analysis = pdfGenerator.analyzeFindings(findings);

    // Create report in database (PROCESSING status)
    const report = await prisma.report.create({
      data: {
        executionId,
        title: `Security Report - ${executionId}`,
        inputFindings: findings,
        summary: {
          totalFindings: analysis.totalFindings,
          criticalCount: analysis.criticalCount,
          highCount: analysis.highCount,
          mediumCount: analysis.mediumCount,
          lowCount: analysis.lowCount,
        },
        status: 'PROCESSING',
        generatedAt: new Date(),
      },
    });

    console.log(`📝 Created report record: ${report.id}`);

    // Prepare data for PDF
    const reportData = {
      executionId,
      findings: findings.map((f: any, index: number) => ({
        id: f.id || `finding-${index + 1}`,
        title: f.title || `Security Finding ${index + 1}`,
        severity: (f.severity || 'MEDIUM').toUpperCase() as 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
        description: f.description || f.details || 'No description provided.',
        recommendation: f.recommendation || f.remediation || 'Investigate and take appropriate action.',
        timestamp: f.timestamp || new Date().toISOString(),
        source: f.source || f.domain || 'Unknown',
      })),
      metadata: {
        generatedAt: new Date(),
        totalFindings: analysis.totalFindings,
        criticalCount: analysis.criticalCount,
        highCount: analysis.highCount,
        mediumCount: analysis.mediumCount,
        lowCount: analysis.lowCount,
      },
    };

    // Generate PDF
    console.log('📄 Generating PDF...');
    const pdfBuffer = await pdfGenerator.generateReport(reportData);
    
    // Save PDF locally
    const fileName = `report-${executionId}-${Date.now()}.pdf`;
    const filePath = path.join(reportsDir, fileName);
    fs.writeFileSync(filePath, pdfBuffer);
    console.log(`✅ PDF saved: ${filePath}`);
    
    // Create URLs
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const downloadUrl = `${baseUrl}/api/reports/download/${fileName}`;
    const fileSize = `${(pdfBuffer.length / 1024).toFixed(2)} KB`;

    // Update report with PDF info (COMPLETED status)
    const updatedReport = await prisma.report.update({
      where: { id: report.id },
      data: {
        pdfUrl: downloadUrl,
        pdfPath: filePath,
        fileSize: fileSize,
        status: 'COMPLETED',
        updatedAt: new Date(),
      },
    });

    console.log(`✅ Report ${report.id} saved to database`);

    // Success response
    res.json({
      success: true,
      message: 'Report generated successfully',
      data: {
        reportId: updatedReport.id,
        executionId: updatedReport.executionId,
        metadata: reportData.metadata,
        pdf: {
          fileName,
          fileSize,
          downloadUrl,
          viewUrl: `${baseUrl}/api/reports/view/${fileName}`,
          localPath: filePath,
        },
        summary: analysis,
        databaseRecord: {
          id: updatedReport.id,
          status: updatedReport.status,
          createdAt: updatedReport.createdAt,
          updatedAt: updatedReport.updatedAt,
        },
        timestamp: new Date().toISOString(),
      },
    });

  } catch (error: any) {
    console.error('❌ Error generating report:', error);
    
    // Try to update status to FAILED if we have executionId
    try {
      const { executionId } = req.body;
      if (executionId) {
        await prisma.report.updateMany({
          where: { executionId },
          data: {
            status: 'FAILED',
            summary: { 
              error: error.message,
              timestamp: new Date().toISOString()
            },
            updatedAt: new Date(),
          },
        });
      }
    } catch (dbError) {
      console.error('❌ Failed to update report status:', dbError);
    }

    res.status(500).json({
      success: false,
      error: 'Failed to generate report',
      message: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// ========== GET REPORT BY ID ==========
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const report = await prisma.report.findUnique({
      where: { id },
    });
    
    if (!report) {
      return res.status(404).json({ 
        success: false, 
        error: 'Report not found' 
      });
    }
    
    res.json({
      success: true,
      data: report,
    });
  } catch (error) {
    console.error('❌ Error fetching report:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch report' 
    });
  }
});

// ========== GET REPORT BY EXECUTION ID ==========
router.get('/execution/:executionId', async (req, res) => {
  try {
    const { executionId } = req.params;
    
    const report = await prisma.report.findUnique({
      where: { executionId },
    });
    
    if (!report) {
      return res.status(404).json({ 
        success: false, 
        error: 'Report not found' 
      });
    }
    
    res.json({
      success: true,
      data: report,
    });
  } catch (error) {
    console.error('❌ Error fetching report:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch report' 
    });
  }
});

// ========== LIST ALL REPORTS ==========
router.get('/', async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      status,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;
    
    const skip = (Number(page) - 1) * Number(limit);
    const where: any = {};
    
    if (status) {
      where.status = status;
    }
    
    const [reports, total] = await Promise.all([
      prisma.report.findMany({
        where,
        orderBy: { [sortBy as string]: sortOrder },
        skip,
        take: Number(limit),
        select: {
          id: true,
          executionId: true,
          title: true,
          status: true,
          pdfUrl: true,
          fileSize: true,
          createdAt: true,
          updatedAt: true,
          generatedAt: true,
        }
      }),
      prisma.report.count({ where }),
    ]);
    
    res.json({
      success: true,
      data: reports,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error('❌ Error listing reports:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to list reports' 
    });
  }
});

// ========== DOWNLOAD PDF ==========
router.get('/download/:filename', (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = path.join(reportsDir, filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ 
        success: false, 
        error: 'Report file not found' 
      });
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
    
  } catch (error) {
    console.error('❌ Error downloading report:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to download report' 
    });
  }
});

// ========== VIEW PDF IN BROWSER ==========
router.get('/view/:filename', (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = path.join(reportsDir, filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ 
        success: false, 
        error: 'Report file not found' 
      });
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
    
  } catch (error) {
    console.error('❌ Error viewing report:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to view report' 
    });
  }
});

// ========== LIST ALL PDF FILES ==========
router.get('/list/files', (req, res) => {
  try {
    const files = fs.readdirSync(reportsDir)
      .filter(file => file.endsWith('.pdf'))
      .map(file => {
        const filePath = path.join(reportsDir, file);
        const stats = fs.statSync(filePath);
        
        return {
          name: file,
          downloadUrl: `/api/reports/download/${file}`,
          viewUrl: `/api/reports/view/${file}`,
          size: `${(stats.size / 1024).toFixed(2)} KB`,
          created: stats.birthtime,
        };
      })
      .sort((a, b) => b.created.getTime() - a.created.getTime());

    res.json({
      success: true,
      count: files.length,
      reports: files,
    });
  } catch (error) {
    console.error('❌ Error listing files:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to list files' 
    });
  }
});

// ========== DELETE REPORT ==========
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const report = await prisma.report.findUnique({
      where: { id },
    });
    
    if (!report) {
      return res.status(404).json({ 
        success: false, 
        error: 'Report not found' 
      });
    }
    
    // Delete file if exists
    if (report.pdfPath && fs.existsSync(report.pdfPath)) {
      fs.unlinkSync(report.pdfPath);
    }
    
    // Delete from database
    await prisma.report.delete({
      where: { id },
    });
    
    res.json({
      success: true,
      message: `Report ${id} deleted successfully`,
      deletedFile: report.pdfPath,
    });
  } catch (error) {
    console.error('❌ Error deleting report:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to delete report' 
    });
  }
});

// ========== DATABASE TEST ENDPOINT ==========
router.get('/test/db', async (req, res) => {
  try {
    // Test connection
    await prisma.$queryRaw`SELECT 1`;
    
    // Create test record
    const testReport = await prisma.report.create({
      data: {
        executionId: `test-${Date.now()}`,
        title: 'Database Test Report',
        inputFindings: [{ test: 'data' }],
        summary: { test: 'success' },
        status: 'COMPLETED',
        generatedAt: new Date(),
      },
    });
    
    // Count records
    const count = await prisma.report.count();
    
    // Delete test record
    await prisma.report.delete({
      where: { id: testReport.id }
    });
    
    res.json({
      success: true,
      message: 'Database test successful',
      operations: {
        connection: 'OK',
        create: 'OK',
        count: 'OK',
        delete: 'OK',
      },
      count: count - 1, // minus the one we deleted
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: 'Database test failed',
      message: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

export default router;