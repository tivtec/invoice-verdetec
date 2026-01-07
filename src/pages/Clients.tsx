import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SearchBar } from '@/components/SearchBar';
import { useToast } from '@/hooks/use-toast';
import { getImporters, createImporter, updateImporter, deleteImporter } from '@/utils/supabaseStorage';

type Importer = {
  id: string;
  company_name: string;
  tax_id: string;
  address: string;
  zip_code: string;
  phone: string;
  email: string | null;
  country: string;
};

const emptyForm = {
  company_name: '',
  tax_id: '',
  address: '',
  zip_code: '',
  phone: '',
  email: '',
  country: '',
};

const Clients = () => {
  const [importers, setImporters] = useState<Importer[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const { toast } = useToast();
  const navigate = useNavigate();

  const loadImporters = async () => {
    try {
      setLoading(true);
      const data = await getImporters();
      setImporters(data as Importer[]);
    } catch (error) {
      console.error('Error loading clients:', error);
      toast({
        title: 'Erro ao carregar clientes',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadImporters();
  }, []);

  const filteredImporters = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return importers;
    return importers.filter((imp) =>
      [imp.company_name, imp.tax_id, imp.email, imp.phone, imp.country]
        .filter(Boolean)
        .some((field) => field!.toLowerCase().includes(q))
    );
  }, [importers, search]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.company_name || !form.tax_id || !form.country) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Informe Nome, Tax ID e País.',
        variant: 'destructive',
      });
      return;
    }
    try {
      setLoading(true);
      if (editingId) {
        await updateImporter(editingId, form);
        toast({ title: 'Cliente atualizado' });
      } else {
        await createImporter(form);
        toast({ title: 'Cliente criado' });
      }
      setForm(emptyForm);
      setEditingId(null);
      await loadImporters();
    } catch (error) {
      console.error('Error saving client:', error);
      toast({
        title: 'Erro ao salvar cliente',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (imp: Importer) => {
    setEditingId(imp.id);
    setForm({
      company_name: imp.company_name,
      tax_id: imp.tax_id,
      address: imp.address,
      zip_code: imp.zip_code,
      phone: imp.phone,
      email: imp.email || '',
      country: imp.country,
    });
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja excluir este cliente?')) return;
    try {
      setLoading(true);
      await deleteImporter(id);
      toast({ title: 'Cliente excluído' });
      await loadImporters();
    } catch (error) {
      console.error('Error deleting client:', error);
      toast({
        title: 'Erro ao excluir cliente',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setForm(emptyForm);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold">Clientes</h1>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate('/')}>
              Voltar para Pedidos
            </Button>
            <Button variant="outline" onClick={() => navigate('/products')}>
              Produtos
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        <Card className="p-4">
          <h2 className="text-lg font-semibold mb-2">{editingId ? 'Editar Cliente' : 'Novo Cliente'}</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Nome / Razão Social *</Label>
              <Input
                value={form.company_name}
                onChange={(e) => setForm({ ...form, company_name: e.target.value })}
                required
              />
            </div>
            <div>
              <Label>Tax ID (CNPJ/CPF) *</Label>
              <Input
                value={form.tax_id}
                onChange={(e) => setForm({ ...form, tax_id: e.target.value })}
                required
              />
            </div>
            <div>
              <Label>E-mail</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div>
              <Label>Telefone</Label>
              <Input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>
            <div>
              <Label>País *</Label>
              <Input
                value={form.country}
                onChange={(e) => setForm({ ...form, country: e.target.value })}
                required
              />
            </div>
            <div>
              <Label>CEP / Zip</Label>
              <Input
                value={form.zip_code}
                onChange={(e) => setForm({ ...form, zip_code: e.target.value })}
              />
            </div>
            <div className="md:col-span-2">
              <Label>Endereço</Label>
              <Input
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
              />
            </div>
            <div className="flex gap-2 md:col-span-2">
              <Button type="submit" disabled={loading}>
                {editingId ? 'Atualizar' : 'Salvar'}
              </Button>
              {editingId && (
                <Button type="button" variant="outline" onClick={handleCancelEdit}>
                  Cancelar edição
                </Button>
              )}
            </div>
          </form>
        </Card>

        <Card className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Lista de clientes</h2>
            <div className="w-full max-w-md">
              <SearchBar
                value={search}
                onChange={setSearch}
                placeholder="Buscar por nome, Tax ID, e-mail, telefone ou país..."
              />
            </div>
          </div>

          <div className="space-y-2">
            {filteredImporters.map((imp) => (
              <div key={imp.id} className="border rounded-md p-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3 bg-muted/30">
                <div>
                  <p className="font-semibold">{imp.company_name}</p>
                  <p className="text-xs text-muted-foreground">Tax ID: {imp.tax_id}</p>
                  <p className="text-xs text-muted-foreground">E-mail: {imp.email || '—'}</p>
                  <p className="text-xs text-muted-foreground">Telefone: {imp.phone || '—'}</p>
                  <p className="text-xs text-muted-foreground">País: {imp.country}</p>
                  <p className="text-xs text-muted-foreground">Endereço: {imp.address || '—'}, CEP: {imp.zip_code || '—'}</p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => handleEdit(imp)}>
                    Editar
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => handleDelete(imp.id)}>
                    Excluir
                  </Button>
                </div>
              </div>
            ))}
            {filteredImporters.length === 0 && (
              <p className="text-sm text-muted-foreground">Nenhum cliente encontrado.</p>
            )}
          </div>
        </Card>
      </main>
    </div>
  );
};

export default Clients;
