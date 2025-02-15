import { Parser } from 'json2csv';
import PDFDocument from 'pdfkit';
import { ISubscription } from '../../models/interfaces/SubscriptionInterface';

// Helper to format date
const formatDate = (date: Date) => {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

// Format currency
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount);
};

export const generateStatusHistoryCSV = (statusHistory: ISubscription['statusHistory']) => {
    console.log(statusHistory)
    const fields = [
        { label: 'Date', value: (row: any) => formatDate(row.date) },
        { label: 'Status', value: 'status' },
        { label: 'Amount', value: (row: any) => row.price ? formatCurrency(row.price) : '$0.00' },
        { label: 'Payment Method', value: 'paymentMethod' },
        { label: 'Invoice ID', value: 'invoiceId' },
        { label: 'Start Date', value: (row: any) => row.startDate ? formatDate(row.startDate) : '' },
        { label: 'End Date', value: (row: any) => row.endDate ? formatDate(row.endDate) : '' },
        { label: 'Reason', value: 'reason' }
    ];

  const parser = new Parser({ fields });
  return parser.parse(statusHistory);
};

export const generateStatusHistoryPDF = (statusHistory: ISubscription['statusHistory'], userEmail: string) => {
    return new Promise((resolve, reject) => {
      try {
        // Create PDF with larger margins for a cleaner look
        const doc = new PDFDocument({ margin: 60 });
        const chunks: Buffer[] = [];
        
        // Collect PDF chunks
        doc.on('data', chunk => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
  
        // Modern header with user email
        doc.font('Helvetica-Bold')
          .fontSize(24)
          .fillColor('#2C3E50')
          .text('Subscription History', { align: 'center' });
        
        doc.fontSize(14)
          .fillColor('#7F8C8D')
          .text(userEmail, { align: 'center' });
        
        doc.moveDown(2);
  
        // Process each record with a card-like design
        let yPosition = 160;
  
        statusHistory.forEach((record, index) => {
            // Calculate card height and check if we need a new page
          const cardHeight = 140; // Height of the card
          const cardMargin = 20;  // Space between cards
          const totalCardHeight = cardHeight + cardMargin;

          // Add a new page if needed
          if (yPosition + cardHeight > 680) {
            doc.addPage();
            yPosition = 60;
          }
  
          // Draw card background
          doc.rect(60, yPosition, 492, 140)
            .fillAndStroke('#F8F9FA', '#E9ECEF');
  
          // Content padding
          const contentX = 80;
          let contentY = yPosition + 20;
  
          // Left column
          doc.font('Helvetica-Bold')
            .fontSize(12)
            .fillColor('#2C3E50');
  
          // Date and Status (primary info) with larger text
          doc.text(formatDate(record.date), contentX, contentY);
          doc.font('Helvetica')
            .fontSize(14)
            .fillColor('#2C3E50')
            .text(record.status, contentX + 200, contentY);
          
          // Amount with prominent display
          doc.font('Helvetica-Bold')
            .fontSize(14)
            .fillColor('#2C3E50')
            .text(formatCurrency(record.price || 0), contentX + 350, contentY);
  
          contentY += 30;
  
          // Secondary information with consistent formatting
          const secondaryColor = '#626262';
          doc.font('Helvetica')
            .fontSize(11)
            .fillColor(secondaryColor);
  
          // First row of secondary info
          doc.text(`Payment: ${record.paymentMethod || 'N/A'}`, contentX, contentY);
          doc.text(`Invoice ID: ${record.invoiceId || 'N/A'}`, contentX + 200, contentY);
  
          contentY += 25;
  
          // Second row of secondary info
          const startDate = record.startDate ? formatDate(record.startDate) : 'N/A';
          const endDate = record.endDate ? formatDate(record.endDate) : 'N/A';
          doc.text(`Start Date: ${startDate}`, contentX, contentY);
          doc.text(`End Date: ${endDate}`, contentX + 200, contentY);
  
          contentY += 25;
  
          // Reason (if exists) with subtle styling
          if (record.reason) {
            doc.font('Helvetica')
              .fontSize(11)
              .fillColor('#666666')
              .text(`Note: ${record.reason}`, contentX, contentY, {
                width: 432,
                height: 20,
                ellipsis: true
              });
          }
  
          yPosition += totalCardHeight; // Space between cards
        });
  
        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  };

interface CustomerStatusHistory {
customerEmail: string;
statusHistory: ISubscription['statusHistory'];
}
  
// CSV Export
export const generateAllStatusHistoryCSV = (customersData: CustomerStatusHistory[]) => {
    // Define CSV headers
    const headers = [
        'Customer Email',
        'Date',
        'Status',
        'Amount',
        'Payment Method',
        'Invoice ID',
        'Start Date',
        'End Date',
        'Reason'
    ].join(',');

    console.log(customersData.flatMap(({statusHistory}) => statusHistory))
    // Convert data to CSV rows
    const rows = customersData.flatMap(({ customerEmail, statusHistory }) =>
        statusHistory.map(record => [
        customerEmail,
        formatDate(record.date).replace(/,/g, '-'), // Replace commas in dates
        record.status,
        formatCurrency(record.price || 0),
        record.paymentMethod || '',
        record.invoiceId || '',
        record.startDate ? formatDate(record.startDate).replace(/,/g, '-') : '',
        record.endDate ? formatDate(record.endDate).replace(/,/g, '-') : '',
        (record.reason || '').replace(/,/g, ';') // Replace commas to prevent CSV issues
        ].join(','))
    );

    // Combine headers and rows
    return [headers, ...rows].join('\n');
};
  
  // PDF Export
export const generateAllStatusHistoryPDF = (customersData: CustomerStatusHistory[]) => {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 60 });
        const chunks: Buffer[] = [];
  
        doc.on('data', chunk => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
  
        // Header
        doc.font('Helvetica-Bold')
           .fontSize(24)
           .fillColor('#2C3E50')
           .text('Customer Subscription History', { align: 'center' });
        
        doc.moveDown(2);
  
        let yPosition = 160;
        
        // Process each customer
        customersData.forEach(({ customerEmail, statusHistory }) => {
          // Calculate required height for customer email header
            const headerHeight = 40;
            
            // Check if we need a new page for the customer header
            if (yPosition + headerHeight > 680) {
                doc.addPage();
                yPosition = 60;
            }
  
          doc.font('Helvetica-Bold')
             .fontSize(16)
             .fillColor('#2C3E50')
             .text(customerEmail, 60, yPosition);
  
          yPosition += headerHeight;
  
          // Process each status record
          statusHistory.forEach((record) => {
            // Calculate total card height including margins
            const cardHeight = 160; // Height of card
            const cardMargin = 40;  // Space between cards
            const totalCardHeight = cardHeight + cardMargin;

            if (yPosition + cardHeight > 680) {
              doc.addPage();
              yPosition = 60;
            }
  
            // Draw card background
            doc.rect(60, yPosition, 492, 140)
               .fillAndStroke('#F8F9FA', '#E9ECEF');
  
            const contentX = 80;
            let contentY = yPosition + 20;
  
            // Primary info
            doc.font('Helvetica-Bold')
               .fontSize(12)
               .fillColor('#2C3E50')
               .text(formatDate(record.date), contentX, contentY);
  
            doc.font('Helvetica')
               .fontSize(14)
               .fillColor('#2C3E50')
               .text(record.status, contentX + 200, contentY);
  
            doc.font('Helvetica-Bold')
               .fontSize(14)
               .fillColor('#2C3E50')
               .text(formatCurrency(record.price || 0), contentX + 350, contentY);
  
            contentY += 30;
  
            // Secondary info
            const secondaryColor = '#626262';
            doc.font('Helvetica')
               .fontSize(11)
               .fillColor(secondaryColor);
  
            // Payment and Invoice
            doc.text(`Payment: ${record.paymentMethod || 'N/A'}`, contentX, contentY);
            
            if (record.hostedInvoiceUrl) {
              doc.fillColor('#0066CC')
                 .text('View Invoice', contentX + 200, contentY, {
                   link: record.hostedInvoiceUrl,
                   underline: true
                 });
            } else {
              doc.fillColor(secondaryColor)
                 .text(`Invoice: ${record.invoiceId || 'N/A'}`, contentX + 200, contentY);
            }
  
            contentY += 25;
  
            // Dates
            const startDate = record.startDate ? formatDate(record.startDate) : 'N/A';
            const endDate = record.endDate ? formatDate(record.endDate) : 'N/A';
            doc.text(`Start Date: ${startDate}`, contentX, contentY);
            doc.text(`End Date: ${endDate}`, contentX + 200, contentY);
  
            contentY += 25;
  
            // Reason
            if (record.reason) {
              doc.font('Helvetica')
                 .fontSize(11)
                 .fillColor('#666666')
                 .text(`Note: ${record.reason}`, contentX, contentY, {
                   width: 432,
                   height: 20,
                   ellipsis: true
                 });
            }
  
            yPosition += cardHeight;
          });
  
          // Add space between customers only if not at start of page
            if (yPosition !== 60) {
                yPosition += 40;
            }
        });
  
        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  };
  