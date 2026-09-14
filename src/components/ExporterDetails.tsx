import { getCompanyData } from '@/types/invoice';

interface ExporterDetailsProps {
  company: ReturnType<typeof getCompanyData>;
  compact?: boolean;
}

export const ExporterDetails = ({ company, compact = false }: ExporterDetailsProps) => {
  const textClassName = compact ? 'text-xs' : 'text-sm';

  if ('tradeName' in company) {
    return (
      <>
        <p className={textClassName}>
          <span className="font-semibold">Razão Social:</span> {company.name}
        </p>
        <p className={textClassName}>
          <span className="font-semibold">Nome Fantasia:</span> {company.tradeName}
        </p>
        <p className={textClassName}>
          <span className="font-semibold">CNPJ:</span> {company.cnpj}
        </p>
        <p className={`${textClassName} break-words`}>
          <span className="font-semibold">Endereço:</span> {company.address}, CEP {company.zipCode}
        </p>
        <p className={textClassName}>
          <span className="font-semibold">E-mail:</span> {company.email}
        </p>
        <p className={textClassName}>
          <span className="font-semibold">Telefone:</span> {company.phone}
        </p>
      </>
    );
  }

  return (
    <>
      <p className={`${textClassName} ${compact ? 'font-bold' : ''}`}>{company.name}</p>
      <p className={textClassName}>CNPJ: {company.cnpj}</p>
      <p className={`${textClassName} break-words`}>{company.address}</p>
      <p className={textClassName}>ZIP Code: {company.zipCode}</p>
      <p className={textClassName}>Phone: {company.phone}</p>
    </>
  );
};
