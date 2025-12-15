import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer';
import type { UrbanismCertificate } from '../types/urbanism';

interface Props {
  certificate: UrbanismCertificate;
  uatName: string;
}

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 11,
    fontFamily: 'Helvetica',
    backgroundColor: '#ffffff',
  },
  header: {
    marginBottom: 30,
    borderBottom: '2 solid #1e40af',
    paddingBottom: 15,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  logo: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e40af',
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 10,
    color: '#1f2937',
    textTransform: 'uppercase',
  },
  certNumber: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 5,
    color: '#4b5563',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#1e40af',
    backgroundColor: '#eff6ff',
    padding: 6,
    borderLeft: '3 solid #1e40af',
    paddingLeft: 10,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  label: {
    width: '35%',
    fontWeight: 'bold',
    color: '#374151',
  },
  value: {
    width: '65%',
    color: '#1f2937',
  },
  textBlock: {
    marginTop: 5,
    padding: 10,
    backgroundColor: '#f9fafb',
    borderRadius: 4,
    lineHeight: 1.5,
    color: '#1f2937',
  },
  checkboxSection: {
    marginTop: 8,
  },
  checkbox: {
    flexDirection: 'row',
    marginBottom: 4,
    alignItems: 'center',
  },
  checkboxIcon: {
    width: 12,
    height: 12,
    border: '1 solid #6b7280',
    marginRight: 6,
    backgroundColor: '#3b82f6',
  },
  checkboxIconEmpty: {
    width: 12,
    height: 12,
    border: '1 solid #6b7280',
    marginRight: 6,
  },
  checkboxLabel: {
    fontSize: 10,
    color: '#374151',
  },
  footer: {
    marginTop: 40,
    paddingTop: 20,
    borderTop: '1 solid #e5e7eb',
  },
  signature: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 30,
  },
  signatureBlock: {
    width: '45%',
    textAlign: 'center',
  },
  signatureLabel: {
    fontSize: 10,
    color: '#6b7280',
    marginBottom: 30,
  },
  signatureLine: {
    borderTop: '1 solid #9ca3af',
    paddingTop: 5,
    fontSize: 9,
    color: '#6b7280',
  },
  watermark: {
    position: 'absolute',
    fontSize: 60,
    color: '#e5e7eb',
    opacity: 0.1,
    transform: 'rotate(-45deg)',
    top: '40%',
    left: '20%',
  },
});

export default function UrbanismCertificatePDF({ certificate, uatName }: Props) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ro-RO', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Watermark */}
        <Text style={styles.watermark}>CERTIFICAT</Text>

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <Text style={styles.logo}>🏛️ {uatName}</Text>
            <Text style={{ fontSize: 10, color: '#6b7280' }}>
              {formatDate(certificate.issueDate)}
            </Text>
          </View>
          <Text style={styles.title}>Certificat de Urbanism</Text>
          <Text style={styles.certNumber}>Nr. {certificate.number}</Text>
        </View>

        {/* 1. Date Solicitant */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. Date despre solicitant</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Nume / Denumire:</Text>
            <Text style={styles.value}>{certificate.applicant.name}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>CNP / CUI:</Text>
            <Text style={styles.value}>{certificate.applicant.cnpCui}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Adresă:</Text>
            <Text style={styles.value}>{certificate.applicant.address}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Telefon:</Text>
            <Text style={styles.value}>{certificate.applicant.phone || 'N/A'}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Email:</Text>
            <Text style={styles.value}>{certificate.applicant.email || 'N/A'}</Text>
          </View>
        </View>

        {/* 2. Identificarea Imobilului */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. Identificarea imobilului</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Localizare:</Text>
            <Text style={styles.value}>{certificate.property.address}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Nr. Cadastral / CF:</Text>
            <Text style={styles.value}>{certificate.property.cadastralNumber}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Suprafață:</Text>
            <Text style={styles.value}>{certificate.property.area} mp</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>UAT:</Text>
            <Text style={styles.value}>{certificate.property.uat}</Text>
          </View>
        </View>

        {/* 3. Scopul Solicitării */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>3. Scopul solicitării</Text>
          <Text style={styles.textBlock}>{certificate.purpose}</Text>
        </View>

        {/* 4. Regimul Juridic */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>4. Regimul juridic</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Proprietar:</Text>
            <Text style={styles.value}>{certificate.legalRegime.owner}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Categorie folosință:</Text>
            <Text style={styles.value}>{certificate.legalRegime.usageCategory}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Regim proprietate:</Text>
            <Text style={styles.value}>{certificate.legalRegime.propertyRegime}</Text>
          </View>
        </View>

        {/* 5. Regimul Tehnic */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>5. Regimul tehnic și urbanistic</Text>
          <Text style={styles.textBlock}>{certificate.technicalRegime}</Text>
        </View>

        {/* 6. Restricții */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>6. Servituți și restricții</Text>
          <Text style={styles.textBlock}>{certificate.restrictions}</Text>
        </View>

        {/* 7. Documente Necesare */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>7. Documente necesare la următoarea etapă</Text>
          <View style={styles.checkboxSection}>
            <View style={styles.checkbox}>
              <View style={certificate.requiredDocuments.planCadastral ? styles.checkboxIcon : styles.checkboxIconEmpty} />
              <Text style={styles.checkboxLabel}>Plan cadastral</Text>
            </View>
            <View style={styles.checkbox}>
              <View style={certificate.requiredDocuments.planSituatie ? styles.checkboxIcon : styles.checkboxIconEmpty} />
              <Text style={styles.checkboxLabel}>Plan de situație</Text>
            </View>
            <View style={styles.checkbox}>
              <View style={certificate.requiredDocuments.extrasCF ? styles.checkboxIcon : styles.checkboxIconEmpty} />
              <Text style={styles.checkboxLabel}>Extras CF</Text>
            </View>
            <View style={styles.checkbox}>
              <View style={certificate.requiredDocuments.studiuGeotehnic ? styles.checkboxIcon : styles.checkboxIconEmpty} />
              <Text style={styles.checkboxLabel}>Studiu geotehnic</Text>
            </View>
            <View style={styles.checkbox}>
              <View style={certificate.requiredDocuments.memoriuTehnic ? styles.checkboxIcon : styles.checkboxIconEmpty} />
              <Text style={styles.checkboxLabel}>Memoriu tehnic</Text>
            </View>
            {certificate.requiredDocuments.alteDocumente && (
              <View style={{ marginTop: 6 }}>
                <Text style={styles.label}>Alte documente:</Text>
                <Text style={styles.value}>{certificate.requiredDocuments.alteDocumente}</Text>
              </View>
            )}
          </View>
        </View>

        {/* 8. Observații */}
        {certificate.observations && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>8. Observații</Text>
            <Text style={styles.textBlock}>{certificate.observations}</Text>
          </View>
        )}

        {/* Footer & Signatures */}
        <View style={styles.footer}>
          <Text style={{ fontSize: 9, color: '#6b7280', marginBottom: 10 }}>
            Prezentul certificat de urbanism este valabil 12 luni de la data emiterii.
          </Text>
          <View style={styles.signature}>
            <View style={styles.signatureBlock}>
              <Text style={styles.signatureLabel}>Întocmit,</Text>
              <Text style={styles.signatureLine}>Arhitect Șef</Text>
            </View>
            <View style={styles.signatureBlock}>
              <Text style={styles.signatureLabel}>Aprobat,</Text>
              <Text style={styles.signatureLine}>Primar</Text>
            </View>
          </View>
        </View>
      </Page>
    </Document>
  );
}
