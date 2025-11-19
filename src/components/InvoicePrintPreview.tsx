import { Invoice, COMPANY_DATA } from '@/types/invoice';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Printer } from 'lucide-react';

interface InvoicePrintPreviewProps {
  invoice: Invoice;
  onBack: () => void;
}

export const InvoicePrintPreview = ({ invoice, onBack }: InvoicePrintPreviewProps) => {
  const handlePrint = () => {
    window.print();
  };

  const company = COMPANY_DATA[invoice.companyType];
  const totalWeight = invoice.items.reduce((sum, item) => sum + item.weight, 0);
  const subtotal = invoice.items.reduce((sum, item) => sum + item.total, 0);

  return (
    <div className="min-h-screen bg-muted">
      <div className="print:hidden p-4 bg-background border-b flex gap-4">
        <Button onClick={onBack} variant="outline">
          <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
        </Button>
        <Button onClick={handlePrint}>
          <Printer className="mr-2 h-4 w-4" /> Imprimir
        </Button>
      </div>

      <div className="print:p-0 p-8">
        <div className="bg-background w-[210mm] mx-auto p-[20mm] print:shadow-none shadow-lg" style={{ minHeight: '297mm' }}>
          {/* Header */}
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold">PROFORMA INVOICE</h1>
          </div>

          {/* Supplier and Invoice Info */}
          <div className="grid grid-cols-2 gap-8 mb-6">
            <div>
              <h3 className="font-semibold mb-2">Supplier / Exporter:</h3>
              <p className="font-bold">{company.name}</p>
              <p>CNPJ: {company.cnpj}</p>
              <p>{company.address}</p>
              <p>ZIP Code: {company.zipCode}</p>
              <p>Phone: {company.phone}</p>
              <p>Country of Origin: Brazil</p>
            </div>
            
            <div className="text-right">
              <p><span className="font-semibold">Invoice No.:</span> {invoice.invoiceNumber}</p>
              <p><span className="font-semibold">Issue Date:</span> {invoice.issueDate}</p>
              <p><span className="font-semibold">Place of Issue:</span> {invoice.placeOfIssue}</p>
            </div>
          </div>

          {/* Importer and Terms */}
          <div className="grid grid-cols-2 gap-8 mb-6">
            <div>
              <h3 className="font-semibold mb-2">Importer / Buyer:</h3>
              <p className="font-bold">{invoice.importerCompanyName}</p>
              <p>{invoice.importerTaxId}</p>
              <p>{invoice.importerAddress}</p>
              <p>Zip Code: {invoice.importerZipCode}</p>
              <p>Phone: {invoice.importerPhone}</p>
              <p>E-mail: {invoice.importerEmail}</p>
              <p>Country of Destination: {invoice.importerCountry}</p>
            </div>
            
            <div className="text-right">
              <p><span className="font-semibold">INCOTERM:</span> {invoice.incoterm}</p>
              <p><span className="font-semibold">Mode of Transport:</span> {invoice.modeOfTransport}</p>
              <p><span className="font-semibold">Availability:</span> {invoice.availability}</p>
              <p><span className="font-semibold">Currency:</span> {invoice.currency}</p>
              <p><span className="font-semibold">Payment Method:</span> {invoice.paymentMethod}</p>
            </div>
          </div>

          {/* Items Table */}
          <table className="w-full border-collapse mb-6">
            <thead>
              <tr className="border-b-2 border-foreground">
                <th className="text-left py-2 px-2 text-sm">HS CODE (NCM)</th>
                <th className="text-center py-2 px-2 text-sm">QTY</th>
                <th className="text-left py-2 px-2 text-sm">DESCRIPTION</th>
                <th className="text-right py-2 px-2 text-sm">Weight (KG)</th>
                <th className="text-right py-2 px-2 text-sm">UNIT PRICE</th>
                <th className="text-right py-2 px-2 text-sm">TOTAL</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items.map((item) => (
                <tr key={item.id} className="border-b">
                  <td className="py-2 px-2 text-sm">{item.hsCode}</td>
                  <td className="text-center py-2 px-2 text-sm">{item.qty}</td>
                  <td className="py-2 px-2 text-sm">{item.description}</td>
                  <td className="text-right py-2 px-2 text-sm">{item.weight.toFixed(2)}</td>
                  <td className="text-right py-2 px-2 text-sm">${item.unitPrice.toFixed(2)}</td>
                  <td className="text-right py-2 px-2 text-sm">${item.total.toFixed(2)}</td>
                </tr>
              ))}
              <tr className="border-t-2 border-foreground font-semibold">
                <td colSpan={3} className="py-2 px-2 text-sm text-right">Total Weight:</td>
                <td className="text-right py-2 px-2 text-sm">{totalWeight.toFixed(2)}</td>
                <td className="text-right py-2 px-2 text-sm">Subtotal:</td>
                <td className="text-right py-2 px-2 text-sm">${subtotal.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>

          {/* Bank Details and Total */}
          <div className="grid grid-cols-2 gap-8 mb-8">
            <div>
              <h3 className="font-semibold mb-2">Bank Details:</h3>
              <p>Bank: {company.bankDetails.bank}</p>
              <p>SWIFT: {company.bankDetails.swift}</p>
              <p>IBAN: {company.bankDetails.iban}</p>
            </div>
            
            <div className="text-right">
              <p className="text-xl font-bold">Total Amount</p>
              <p className="text-2xl font-bold">${subtotal.toFixed(2)}</p>
            </div>
          </div>

          {/* Notes Section */}
          {invoice.notes && (
            <div className="mt-8">
              <h3 className="font-semibold mb-2">Note:</h3>
              <p className="text-sm whitespace-pre-wrap">{invoice.notes}</p>
            </div>
          )}

          {/* Signature Area */}
          <div className="mt-12 pt-8 border-t">
            <h3 className="font-semibold mb-8">Client Approval:</h3>
            <div className="grid grid-cols-2 gap-8 mt-16">
              <div className="text-center">
                <div className="border-t border-foreground pt-2">
                  <p className="font-semibold">{invoice.clientRepresentative}</p>
                </div>
              </div>
              <div className="text-center">
                <div className="border-t border-foreground pt-2">
                  <p className="font-semibold">{invoice.clientPosition}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print\\:p-0, .print\\:p-0 * {
            visibility: visible;
          }
          .print\\:p-0 {
            position: absolute;
            left: 0;
            top: 0;
          }
          @page {
            size: A4;
            margin: 0;
          }
        }
      `}</style>
    </div>
  );
};
