import { useEffect, useState } from 'react';
import { Layout } from '@/components/Layout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Database, User } from 'lucide-react';
import CustomerLookup from '@/pages/CustomerLookup';
import TraceabilityExplorer from '@/pages/TraceabilityExplorer';
import { getAllCustomers } from '@/lib/customers';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export default function CustomerTraceability({ defaultTab }: { defaultTab?: 'customer' | 'traceability' }) {
  const [tab, setTab] = useState<'customer' | 'traceability' | 'members'>(defaultTab || 'customer');
  const [customers, setCustomers] = useState(getAllCustomers());
  const [newPhone, setNewPhone] = useState('');
  const [newName, setNewName] = useState('');

  useEffect(() => {
    if (defaultTab) setTab(defaultTab);
  }, [defaultTab]);

  const refreshCustomers = () => {
    setCustomers(getAllCustomers());
  };

  const handleAddMember = () => {
    const phone = newPhone.trim();
    if (!phone) return;
    const { createCustomer } = require('@/lib/customers') as typeof import('@/lib/customers');
    createCustomer({ phone, name: newName });
    setNewPhone('');
    setNewName('');
    refreshCustomers();
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Customer & Traceability</h1>
            <p className="text-muted-foreground mt-1">Bill verification, membership, and batch traceability in one place</p>
          </div>
          <Badge variant="outline" className="font-mono">Merged</Badge>
        </div>

        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 bg-secondary/50 p-1 rounded-xl">
            <TabsTrigger value="customer" className="gap-2 rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm">
              <User className="h-4 w-4" />
              Customer
            </TabsTrigger>
            <TabsTrigger value="members" className="gap-2 rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm">
              <User className="h-4 w-4" />
              Members
            </TabsTrigger>
            <TabsTrigger value="traceability" className="gap-2 rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm">
              <Database className="h-4 w-4" />
              Traceability
            </TabsTrigger>
          </TabsList>

          <TabsContent value="customer" className="animate-in slide-in-from-bottom-2 duration-500">
            <CustomerLookup embedded />
          </TabsContent>

          <TabsContent value="members" className="animate-in slide-in-from-bottom-2 duration-500">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Register Member</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Input
                    placeholder="Customer phone number"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                  />
                  <Input
                    placeholder="Customer name (optional)"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                  />
                  <Button className="w-full" onClick={handleAddMember}>
                    Create Member ID
                  </Button>
                </CardContent>
              </Card>

              <Card className="max-h-[360px] overflow-y-auto">
                <CardHeader>
                  <CardTitle>Existing Members</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {customers.length === 0 ? (
                    <p className="text-muted-foreground">No members registered yet.</p>
                  ) : (
                    customers.map((c) => (
                      <div key={c.memberId} className="flex items-center justify-between border-b border-border/40 py-2">
                        <div>
                          <p className="font-medium">{c.name || 'Member'}</p>
                          <p className="text-xs text-muted-foreground">{c.phone}</p>
                        </div>
                        <Badge variant="outline" className="font-mono text-xs">
                          {c.memberId}
                        </Badge>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="traceability" className="animate-in slide-in-from-bottom-2 duration-500">
            {/* @ts-ignore */}
            <TraceabilityExplorer embedded />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}

