import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { createProduct, deleteProduct, getProducts, updateProduct, ProductRecord } from '@/utils/supabaseStorage';

const emptyForm = {
  hs_code: '',
  description: '',
  weight_kg: '' as string | number,
};

const DEFAULT_PRODUCTS = [
  { hs_code: '84328000', description: 'VTEC-500 – Hydroseeder with Agitator and Bale Grinder', weight_kg: 300 },
  { hs_code: '84328000', description: 'VTEC-2000 – Skid Hydroseeder with Bale Grinder', weight_kg: 840 },
  { hs_code: '84328000', description: 'VTEC-2000 – Trailer Hydroseeder with Bale Grinder', weight_kg: 1080 },
  { hs_code: '84328000', description: 'VTEC-4000 – Skid Hydroseeder with Bale Grinder', weight_kg: 1060 },
  { hs_code: '84328000', description: 'VTEC-8000 – Hydroseeder', weight_kg: 4000 },
  { hs_code: '84328000', description: 'VTEC-12000 – Hydroseeder', weight_kg: 5000 },
  { hs_code: '84329000', description: 'Application Tower – Complete Set (Tower, Cannon and Fences) for VTEC-2000 and VTEC-4000', weight_kg: 57 },
  { hs_code: '84329000', description: 'Application Cannon', weight_kg: 19 },
  { hs_code: '84329000', description: '50 m Flat Heavy-Duty Hose with Camlock Coupling System', weight_kg: null },
];

const Products = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [products, setProducts] = useState<ProductRecord[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [seeding, setSeeding] = useState(false);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const data = await getProducts();
      setProducts(data);
    } catch (error: any) {
      const message = error?.message || 'Erro desconhecido';
      toast({
        title: 'Erro ao carregar produtos',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSeed = async () => {
    try {
      setSeeding(true);
      const existingDescriptions = new Set(products.map((p) => p.description.toLowerCase()));
      const toInsert = DEFAULT_PRODUCTS.filter(
        (p) => !existingDescriptions.has(p.description.toLowerCase())
      );
      if (toInsert.length === 0) {
        toast({ title: 'Nada para importar', description: 'Os produtos base já estão cadastrados.' });
        return;
      }
      for (const p of toInsert) {
        await createProduct({
          hs_code: p.hs_code,
          description: p.description,
          weight_kg: p.weight_kg ?? null,
        });
      }
      toast({ title: 'Produtos base importados', description: `${toInsert.length} item(ns) incluído(s).` });
      await loadProducts();
    } catch (error: any) {
      const message = error?.message || 'Erro desconhecido';
      toast({
        title: 'Erro ao importar produtos base',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setSeeding(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return products;
    return products.filter((p) => {
      const values = [
        p.hs_code ?? '',
        p.description ?? '',
        p.weight_kg != null ? String(p.weight_kg) : '',
      ];
      return values.some((v) => String(v ?? '').toLowerCase().includes(q));
    });
  }, [products, search]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.hs_code || !form.description) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Informe HS Code e descrição.',
        variant: 'destructive',
      });
      return;
    }
    try {
      setLoading(true);
      const payload = {
        hs_code: form.hs_code.trim(),
        description: form.description.trim(),
        weight_kg:
          form.weight_kg === '' ? null : Number(form.weight_kg),
      };
      if (editingId) {
        await updateProduct(editingId, payload);
        toast({ title: 'Produto atualizado' });
      } else {
        await createProduct(payload);
        toast({ title: 'Produto criado' });
      }
      setForm(emptyForm);
      setEditingId(null);
      await loadProducts();
    } catch (error: any) {
      const message = error?.message || 'Erro desconhecido';
      toast({
        title: 'Erro ao salvar produto',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (p: ProductRecord) => {
    setEditingId(p.id);
    setForm({
      hs_code: p.hs_code,
      description: p.description,
      weight_kg: p.weight_kg ?? '',
    });
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja excluir este produto?')) return;
    try {
      setLoading(true);
      await deleteProduct(id);
      toast({ title: 'Produto excluído' });
      await loadProducts();
    } catch (error: any) {
      const message = error?.message || 'Erro desconhecido';
      toast({
        title: 'Erro ao excluir produto',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold">Produtos</h1>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate('/')}>
              Pedidos
            </Button>
            <Button variant="outline" onClick={() => navigate('/clients')}>
              Clientes
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        <Card className="p-4">
          <h2 className="text-lg font-semibold mb-3">{editingId ? 'Editar produto' : 'Novo produto'}</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>HS Code *</Label>
              <Input
                value={form.hs_code}
                onChange={(e) => setForm({ ...form, hs_code: e.target.value })}
                required
              />
            </div>
            <div>
              <Label>Peso (kg)</Label>
              <Input
                type="number"
                step="any"
                value={form.weight_kg}
                onChange={(e) => setForm({ ...form, weight_kg: e.target.value })}
              />
            </div>
            <div className="md:col-span-2">
              <Label>Descrição *</Label>
              <Input
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                required
              />
            </div>
            <div className="flex gap-2 md:col-span-2">
              <Button type="submit" disabled={loading}>
                {editingId ? 'Atualizar' : 'Salvar'}
              </Button>
              {editingId && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setEditingId(null);
                    setForm(emptyForm);
                  }}
                >
                  Cancelar edição
                </Button>
              )}
            </div>
          </form>
        </Card>

        <Card className="p-4 space-y-4">
          <div className="flex items-center gap-3">
            <Input
              placeholder="Buscar por HS Code, descrição ou peso..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground whitespace-nowrap">
                {filtered.length} produto(s)
              </span>
              <Button size="sm" variant="outline" onClick={handleSeed} disabled={seeding || loading}>
                Importar produtos base
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {filtered.map((p) => (
              <div key={p.id} className="border rounded-md p-3 bg-muted/30 flex flex-col gap-1">
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground">HS CODE</p>
                    <p className="font-bold">{p.hs_code}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => handleEdit(p)}>
                      Editar
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => handleDelete(p.id)}>
                      Excluir
                    </Button>
                  </div>
                </div>
                <p className="mt-1 text-sm">{p.description}</p>
                <p className="text-xs text-muted-foreground">Peso: {p.weight_kg ?? 0} kg</p>
              </div>
            ))}
            {filtered.length === 0 && (
              <p className="text-sm text-muted-foreground">Nenhum produto encontrado.</p>
            )}
          </div>
        </Card>
      </main>
    </div>
  );
};

export default Products;
