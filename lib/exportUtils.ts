import jsPDF from 'jspdf'
import 'jspdf-autotable'
import { formatDate, formatTime } from './utils'

export function exportToPDF(data: any[], filename: string) {
  const doc = new jsPDF()
  
  // Título e Meta Info
  doc.setFontSize(18)
  doc.text('Relatório de Produção - Automotive VPC', 14, 22)
  
  doc.setFontSize(11)
  doc.setTextColor(100)
  doc.text(`Data: ${formatDate(new Date())}`, 14, 30)
  
  // Tabela de Dados
  const tableColumn = ["ID", "VIN / Chassi", "Versão", "Funcionário", "Horário"]
  const tableRows = data.map((item, index) => [
    index + 1,
    item.vin,
    item.carVersion,
    item.employee?.name || 'N/A',
    formatTime(item.createdAt)
  ])

  // @ts-ignore - jspdf-autotable adds autoTable to jsPDF
  doc.autoTable({
    head: [tableColumn],
    body: tableRows,
    startY: 35,
    theme: 'grid',
    headStyles: { fillColor: [37, 99, 235], textColor: 255 }, // Blue-600
    styles: { fontSize: 9 },
    alternateRowStyles: { fillColor: [245, 245, 245] }
  })

  // Rodapé com total
  const finalY = (doc as any).lastAutoTable.finalY || 35
  doc.setFontSize(12)
  doc.setTextColor(0)
  doc.text(`Total de Produção: ${data.length} veículos`, 14, finalY + 10)

  // Download do arquivo
  const finalFilename = filename.toLowerCase().endsWith('.pdf') 
    ? filename 
    : filename.split('.')[0] + '.pdf'
    
  doc.save(finalFilename)
}
