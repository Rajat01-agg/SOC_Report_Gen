import PDFDocument from 'pdfkit';

export interface SecurityFinding {
  id: string;
  title: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  recommendation: string;
  timestamp: string;
  source: string;
}

export interface ReportData {
  executionId: string;
  findings: SecurityFinding[];
  metadata: {
    generatedAt: Date;
    totalFindings: number;
    criticalCount: number;
    highCount: number;
    mediumCount: number;
    lowCount: number;
  };
}

export class PDFGenerator {
  async generateReport(reportData: ReportData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        console.log(`📄 Generating PDF for: ${reportData.executionId}`);
        
        const doc = new PDFDocument({ 
          margin: 50,
          size: 'A4',
          info: {
            Title: `SOC Report - ${reportData.executionId}`,
            Author: 'SOC Report Generator',
            CreationDate: new Date(),
          }
        });

        const buffers: Buffer[] = [];
        
        doc.on('data', (chunk) => buffers.push(chunk));
        doc.on('end', () => {
          console.log(`✅ PDF generated: ${buffers.length} bytes`);
          resolve(Buffer.concat(buffers));
        });
        doc.on('error', reject);

        // ========== COVER PAGE ==========
        // Header
        doc.fontSize(32)
          .font('Helvetica-Bold')
          .fillColor('#1e40af')
          .text('SECURITY OPERATIONS CENTER', { align: 'center' });
        
        doc.moveDown(0.5);
        doc.fontSize(24)
          .text('SECURITY REPORT', { align: 'center' });
        
        doc.moveDown(2);
        
        // Report Details
        doc.fontSize(14)
          .font('Helvetica')
          .fillColor('#000000')
          .text(`Report ID: ${reportData.executionId}`, { align: 'center' });
        
        doc.text(`Generated: ${reportData.metadata.generatedAt.toLocaleDateString()}`, { align: 'center' });
        doc.text(`Time: ${reportData.metadata.generatedAt.toLocaleTimeString()}`, { align: 'center' });
        
        doc.moveDown(3);
        
        // Summary Box
        const summaryX = 100;
        const summaryY = doc.y;
        const summaryWidth = 400;
        
        doc.rect(summaryX, summaryY, summaryWidth, 120)
          .fill('#f3f4f6')
          .stroke('#d1d5db');
        
        doc.fontSize(16)
          .font('Helvetica-Bold')
          .fillColor('#1e40af')
          .text('EXECUTIVE SUMMARY', summaryX + 20, summaryY + 20);
        
        doc.fontSize(12)
          .font('Helvetica')
          .fillColor('#000000');
        
        const lines = [
          `Total Findings: ${reportData.metadata.totalFindings}`,
          `Critical: ${reportData.metadata.criticalCount}`,
          `High: ${reportData.metadata.highCount}`,
          `Medium: ${reportData.metadata.mediumCount}`,
          `Low: ${reportData.metadata.lowCount}`,
        ];
        
        lines.forEach((line, index) => {
          doc.text(line, summaryX + 40, summaryY + 50 + (index * 15));
        });
        
        doc.moveDown(6);
        
        // Footer note
        doc.fontSize(10)
          .fillColor('#6b7280')
          .text('CONFIDENTIAL - FOR AUTHORIZED PERSONNEL ONLY', { align: 'center' });

        doc.addPage();

        // ========== EXECUTIVE SUMMARY PAGE ==========
        doc.fontSize(20)
          .font('Helvetica-Bold')
          .fillColor('#1e40af')
          .text('Executive Summary', { underline: true });
        
        doc.moveDown();
        
        doc.fontSize(12)
          .font('Helvetica')
          .fillColor('#000000')
          .text('This report summarizes security findings identified during the assessment period.', { lineGap: 5 });
        
        doc.moveDown();
        
        // Severity Distribution
        doc.fontSize(16)
          .font('Helvetica-Bold')
          .text('Severity Distribution:');
        
        doc.moveDown(0.5);
        
        const severities = [
          { label: 'Critical', count: reportData.metadata.criticalCount, color: '#dc2626' },
          { label: 'High', count: reportData.metadata.highCount, color: '#f97316' },
          { label: 'Medium', count: reportData.metadata.mediumCount, color: '#eab308' },
          { label: 'Low', count: reportData.metadata.lowCount, color: '#22c55e' },
        ];
        
        severities.forEach((sev, index) => {
          const y = doc.y;
          const barWidth = Math.max(50, 300 * (sev.count / Math.max(1, reportData.metadata.totalFindings)));
          doc.rect(100, y, barWidth, 20)
            .fill(sev.color)
            .stroke('#000000');
          
          doc.fontSize(12)
            .fillColor('#000000')
            .text(`${sev.label}: ${sev.count} findings`, 420, y + 4);
          
          doc.moveDown(1.5);
        });
        
        doc.moveDown();
        
        // Recommendations
        doc.fontSize(16)
          .font('Helvetica-Bold')
          .text('Key Recommendations:');
        
        doc.moveDown(0.5);
        
        const recommendations = [
          '1. Address critical findings within 24 hours',
          '2. Review high severity findings within 48 hours',
          '3. Implement monitoring for identified threat patterns',
          '4. Update security policies based on findings',
        ];
        
        recommendations.forEach(rec => {
          doc.fontSize(12)
            .text(rec, { indent: 20, lineGap: 3 });
        });

        doc.addPage();

        // ========== DETAILED FINDINGS PAGE ==========
        doc.fontSize(20)
          .font('Helvetica-Bold')
          .fillColor('#1e40af')
          .text('Detailed Security Findings', { underline: true });
        
        doc.moveDown();
        
        reportData.findings.forEach((finding, index) => {
          // Check if we need a new page
          if (doc.y > 650) {
            doc.addPage();
            doc.fontSize(10)
              .fillColor('#6b7280')
              .text(
                'Generated by SOC Report Generator - CONFIDENTIAL',
                50,
                doc.page.height - 30,
                { align: 'center' }
              );
          }
          
          // Finding header with colored severity
          doc.fontSize(16)
            .font('Helvetica-Bold')
            .fillColor('#000000')
            .text(`${index + 1}. ${finding.title}`);
          
          doc.fontSize(12)
            .fillColor(this.getSeverityColor(finding.severity))
            .text(`[${finding.severity}]`, { continued: false })
            .fillColor('#6b7280')
            .text(` • Source: ${finding.source} • Time: ${new Date(finding.timestamp).toLocaleString()}`, { continued: false });
          
          doc.moveDown(0.5);
          
          // Description
          doc.fontSize(12)
            .fillColor('#000000')
            .font('Helvetica-Bold')
            .text('Description:', { indent: 20 });
          
          doc.fontSize(11)
            .font('Helvetica')
            .text(finding.description, { indent: 40, width: 450, lineGap: 3 });
          
          doc.moveDown(0.3);
          
          // Recommendation
          doc.fontSize(12)
            .font('Helvetica-Bold')
            .text('Recommendation:', { indent: 20 });
          
          doc.fontSize(11)
            .font('Helvetica')
            .fillColor('#065f46')
            .text(finding.recommendation, { indent: 40, width: 450, lineGap: 3 });
          
          // Separator
          doc.moveDown(0.5);
          doc.moveTo(50, doc.y)
            .lineTo(550, doc.y)
            .strokeColor('#d1d5db')
            .lineWidth(1)
            .stroke();
          
          doc.moveDown();
        });

        // Final footer
        const yPosition = doc.page.height - 30;
        doc.fontSize(8)
          .fillColor('#6b7280')
          .text(
            'Generated by SOC Report Generator - CONFIDENTIAL',
            50,
            yPosition,
            { align: 'center' }
          );

        doc.end();
      } catch (error) {
        console.error('❌ PDF generation error:', error);
        reject(error);
      }
    });
  }

  private getSeverityColor(severity: string): string {
    switch (severity) {
      case 'CRITICAL': return '#dc2626';
      case 'HIGH': return '#f97316';
      case 'MEDIUM': return '#eab308';
      case 'LOW': return '#22c55e';
      default: return '#000000';
    }
  }

  // Helper function to analyze findings
  analyzeFindings(findings: any[]): {
    totalFindings: number;
    criticalCount: number;
    highCount: number;
    mediumCount: number;
    lowCount: number;
  } {
    const counts = {
      totalFindings: findings.length,
      criticalCount: 0,
      highCount: 0,
      mediumCount: 0,
      lowCount: 0,
    };

    findings.forEach(finding => {
      const severity = (finding.severity || 'MEDIUM').toUpperCase();
      switch (severity) {
        case 'CRITICAL': counts.criticalCount++; break;
        case 'HIGH': counts.highCount++; break;
        case 'MEDIUM': counts.mediumCount++; break;
        case 'LOW': counts.lowCount++; break;
      }
    });

    return counts;
  }
}

export default PDFGenerator;