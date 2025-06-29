"use client";

import React, { useState, useEffect, useMemo } from 'react';
import type { DataFrame, ChartConfig } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Upload, Library, BarChart2, Dot, LineChart as LineChartIcon } from 'lucide-react';
import {
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
} from "@/components/ui/chart";
import {
    BarChart, Bar, ScatterChart, Scatter, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend
} from "recharts";

// Helper functions copied from data-tab.tsx
const parseCSV = (text: string): DataFrame => {
    const lines = text.trim().split(/\r\n|\n/);
    if (lines.length < 2) throw new Error("CSV must have a header and at least one row.");
    const headers = lines[0].split(',').map(h => h.trim());
    const dataFrame: DataFrame = {};
    headers.forEach(header => { dataFrame[header] = []; });

    for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        const values = lines[i].split(',').map(v => v.trim());
        if (values.length !== headers.length) continue;
        headers.forEach((header, index) => {
            const value = values[index];
            const numValue = Number(value);
            if (!isNaN(numValue) && value.trim() !== '') {
                dataFrame[header].push(numValue);
            } else {
                dataFrame[header].push(value.replace(/^"|"$/g, ''));
            }
        });
    }
    return dataFrame;
};

const parseJSON = (text: string): DataFrame => {
    const jsonData = JSON.parse(text);
    if (!Array.isArray(jsonData) || jsonData.length === 0) throw new Error("JSON must be a non-empty array of objects.");
    const headers = Object.keys(jsonData[0]);
    const dataFrame: DataFrame = {};
    headers.forEach(header => { dataFrame[header] = []; });
    jsonData.forEach((row: Record<string, any>) => {
        headers.forEach(header => {
            const value = row[header];
            const numValue = Number(value);
            if (value !== null && String(value).trim() !== '' && !isNaN(numValue)) {
                dataFrame[header].push(numValue);
            } else {
                dataFrame[header].push(String(value ?? ''));
            }
        });
    });
    return dataFrame;
};


type SavedFile = { name: string; content: string; createdAt: string; };

export default function VisualizationTab() {
    const [data, setData] = useState<DataFrame | null>(null);
    const [galleryFiles, setGalleryFiles] = useState<SavedFile[]>([]);
    const [chartType, setChartType] = useState<string>('scatter');
    const [chartConfigState, setChartConfigState] = useState<{ [key: string]: string }>({});
    const { toast } = useToast();

    useEffect(() => {
        try {
            const files = JSON.parse(localStorage.getItem('fileGallery') || '[]');
            setGalleryFiles(files);
        } catch {
            toast({ variant: 'destructive', title: 'Error', description: 'Could not load files from gallery.' });
        }
    }, []);

    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const isCsv = file.type === "text/csv" || file.name.endsWith('.csv');
        const isJson = file.type === "application/json" || file.name.endsWith('.json');

        if (!isCsv && !isJson) {
            toast({ variant: 'destructive', title: 'Invalid File', description: 'Please upload a valid CSV or JSON file.' });
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const text = e.target?.result as string;
                const df = isCsv ? parseCSV(text) : parseJSON(text);
                setData(df);
                setChartConfigState({}); // Reset config on new data
                toast({ title: 'Success', description: `Loaded ${file.name}.` });
            } catch (error) {
                const message = error instanceof Error ? error.message : "Unknown parsing error.";
                toast({ variant: 'destructive', title: 'Parsing Error', description: message });
            }
        };
        reader.readAsText(file);
        event.target.value = '';
    };

    const handleLoadFromGallery = (fileName: string) => {
        const file = galleryFiles.find(f => f.name === fileName);
        if (file) {
            try {
                const df = parseJSON(file.content);
                setData(df);
                setChartConfigState({}); // Reset config on new data
                toast({ title: 'Success', description: `Loaded "${fileName}" from gallery.` });
            } catch (error) {
                const message = error instanceof Error ? error.message : "Unknown parsing error.";
                toast({ variant: 'destructive', title: `Error loading ${fileName}`, description: message });
            }
        }
    };

    const numericColumns = useMemo(() => data ? Object.keys(data).filter(key => data[key].every(v => typeof v === 'number')) : [], [data]);
    const allColumns = useMemo(() => data ? Object.keys(data) : [], [data]);

    const chartData = useMemo(() => {
        if (!data || !chartConfigState.x) return [];
        const yKey = chartConfigState.y;
        return data[chartConfigState.x].map((_, i) => ({
            x: data![chartConfigState.x][i],
            y: yKey ? data![yKey][i] : undefined
        }));
    }, [data, chartConfigState]);

    const renderChart = () => {
        if (!data || !chartConfigState.x || !chartConfigState.y) return <p className="text-center text-muted-foreground">Please configure the chart settings.</p>;

        const rechartsConfig: ChartConfig = {
            x: { label: chartConfigState.x, color: "hsl(var(--chart-1))" },
            y: { label: chartConfigState.y, color: "hsl(var(--chart-2))" },
        };

        return (
            <div className="h-[450px] w-full">
                <ChartContainer config={rechartsConfig} className="w-full h-full">
                    {chartType === 'scatter' && (
                        <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                            <CartesianGrid />
                            <XAxis type="number" dataKey="x" name={chartConfigState.x} />
                            <YAxis type="number" dataKey="y" name={chartConfigState.y} />
                            <Tooltip cursor={{ strokeDasharray: '3 3' }} content={<ChartTooltipContent />} />
                            <Legend />
                            <Scatter name={chartConfigState.y} data={chartData} fill="var(--color-y)" />
                        </ScatterChart>
                    )}
                    {chartType === 'bar' && (
                         <BarChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="x" name={chartConfigState.x}/>
                            <YAxis />
                            <Tooltip content={<ChartTooltipContent />} />
                            <Legend />
                            <Bar dataKey="y" name={chartConfigState.y} fill="var(--color-y)" />
                        </BarChart>
                    )}
                    {chartType === 'line' && (
                        <LineChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="x" name={chartConfigState.x}/>
                            <YAxis />
                            <Tooltip content={<ChartTooltipContent />} />
                            <Legend />
                            <Line type="monotone" dataKey="y" name={chartConfigState.y} stroke="var(--color-y)" dot={false} />
                        </LineChart>
                    )}
                </ChartContainer>
            </div>
        );
    };

    const renderConfigOptions = () => {
        switch (chartType) {
            case 'scatter':
            case 'line':
                return <>
                    <div className="grid gap-2">
                        <Label>X-Axis (Numeric)</Label>
                        <Select value={chartConfigState.x} onValueChange={(val) => setChartConfigState({...chartConfigState, x: val})}>
                            <SelectTrigger><SelectValue placeholder="Select a feature" /></SelectTrigger>
                            <SelectContent>{numericColumns.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
                        </Select>
                    </div>
                    <div className="grid gap-2">
                        <Label>Y-Axis (Numeric)</Label>
                        <Select value={chartConfigState.y} onValueChange={(val) => setChartConfigState({...chartConfigState, y: val})}>
                            <SelectTrigger><SelectValue placeholder="Select a feature" /></SelectTrigger>
                            <SelectContent>{numericColumns.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
                        </Select>
                    </div>
                </>;
            case 'bar':
                 return <>
                    <div className="grid gap-2">
                        <Label>X-Axis (Category)</Label>
                        <Select value={chartConfigState.x} onValueChange={(val) => setChartConfigState({...chartConfigState, x: val})}>
                            <SelectTrigger><SelectValue placeholder="Select a feature" /></SelectTrigger>
                            <SelectContent>{allColumns.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
                        </Select>
                    </div>
                    <div className="grid gap-2">
                        <Label>Y-Axis (Value)</Label>
                        <Select value={chartConfigState.y} onValueChange={(val) => setChartConfigState({...chartConfigState, y: val})}>
                            <SelectTrigger><SelectValue placeholder="Select a feature" /></SelectTrigger>
                            <SelectContent>{numericColumns.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
                        </Select>
                    </div>
                </>;
            default:
                return null;
        }
    };


    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Load Data for Visualization</CardTitle>
                    <CardDescription>Upload a file or select one from your gallery to get started.</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-4">
                    <Button asChild variant="outline">
                        <Label htmlFor="vis-file-upload" className="cursor-pointer"><Upload className="mr-2" /> Upload File (CSV/JSON)</Label>
                    </Button>
                    <Input id="vis-file-upload" type="file" className="hidden" accept=".csv,.json" onChange={handleFileUpload}/>

                    <div className="flex items-center gap-2">
                        <Library className="mr-2" />
                        <Select onValueChange={handleLoadFromGallery} disabled={galleryFiles.length === 0}>
                            <SelectTrigger className="w-full sm:w-[280px]">
                                <SelectValue placeholder="Or load from gallery..." />
                            </SelectTrigger>
                            <SelectContent>
                                {galleryFiles.map(f => <SelectItem key={f.name} value={f.name}>{f.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            {data && (
                <div className="space-y-6 animate-in fade-in-50 duration-500">
                    <Card>
                        <CardHeader>
                            <CardTitle>Configure Visualization</CardTitle>
                            <CardDescription>Choose a chart type and select the data columns to plot.</CardDescription>
                        </CardHeader>
                        <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <div className="grid gap-2">
                                <Label>Chart Type</Label>
                                <Select value={chartType} onValueChange={(val) => { setChartType(val); setChartConfigState({}); }}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="scatter"><div className="flex items-center gap-2"><Dot className="h-4 w-4" /> Scatter Plot</div></SelectItem>
                                        <SelectItem value="bar"><div className="flex items-center gap-2"><BarChart2 className="h-4 w-4" /> Bar Chart</div></SelectItem>
                                        <SelectItem value="line"><div className="flex items-center gap-2"><LineChartIcon className="h-4 w-4" /> Line Chart</div></SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            {renderConfigOptions()}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="capitalize">{chartType} Plot</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {renderChart()}
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}
