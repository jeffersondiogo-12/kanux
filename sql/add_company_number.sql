-- Adicionar coluna company_number na tabela companies
ALTER TABLE companies ADD COLUMN IF NOT EXISTS company_number INTEGER UNIQUE;

-- Popular company_number com valores sequenciais únicos
-- Isso usa uma sequência para garantir números únicos
CREATE SEQUENCE IF NOT EXISTS company_number_seq;

-- Atualizar empresas existentes com números sequenciais
UPDATE companies 
SET company_number = nextval('company_number_seq')
WHERE company_number IS NULL;

-- Definir valor padrão para novas empresas
ALTER TABLE companies 
ALTER COLUMN company_number SET DEFAULT nextval('company_number_seq');

-- Tornar a coluna obrigatória para novas inserções
ALTER TABLE companies 
ALTER COLUMN company_number SET NOT NULL;

-- Verificar o resultado
SELECT id, name, slug, company_number FROM companies ORDER BY company_number;

