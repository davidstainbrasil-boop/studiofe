
'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { WebhookSettings } from '@/components/admin/WebhookSettings';

export default function AdminSettingsPage() {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
                <p className="text-muted-foreground">System-wide configurations.</p>
            </div>

            <div className="grid gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Feature Flags</CardTitle>
                        <CardDescription>Toggle system features.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label>Maintenance Mode</Label>
                                <p className="text-sm text-muted-foreground">Disable all write operations.</p>
                            </div>
                            <Switch disabled checked={false} />
                        </div>
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label>New Render Engine (V2)</Label>
                                <p className="text-sm text-muted-foreground">Enable cloud worker pipeline.</p>
                            </div>
                            <Switch defaultChecked />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Retention Policy</CardTitle>
                        <CardDescription>Configure auto-cleanup duration (days).</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label>Completed Jobs</Label>
                                <Input type="number" defaultValue={30} />
                            </div>
                            <div className="space-y-2">
                                <Label>Failed Jobs</Label>
                                <Input type="number" defaultValue={7} />
                            </div>
                            <div className="space-y-2">
                                <Label>Temp Files</Label>
                                <Input type="number" defaultValue={1} />
                            </div>
                        </div>
                        <Button className="mt-2" variant="outline">Save Policy</Button>
                    </CardContent>
                </Card>

                {/* Webhook Settings */}
                <WebhookSettings />
            </div>
        </div>
    );
}
