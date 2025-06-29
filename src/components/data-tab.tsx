"use client";

import React, { useState } from 'react';
import type { DataFrame } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Download, Loader2, Upload, Save } from 'lucide-react';
import { Textarea } from './ui/textarea';
import { handleDataGeneration } from '@/app/actions';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";


interface DataTabProps {
  activeDataFrame: DataFrame | null;
  setActiveDataFrame: React.Dispatch<React.SetStateAction<DataFrame | null>>;
}

type DataProfile = {
  [key: string]: {
    type: 'numeric' | 'categorical';
    stats: Record<string, number | string>;
  };
};

const parseCSV = (text: string): DataFrame => {
    const lines = text.trim().split(/\r\n|\n/);
    if (lines.length < 2) {
        throw new Error("CSV must have a header and at least one row of data.");
    }

    const headers = lines[0].split(',').map(h => h.trim());
    const dataFrame: DataFrame = {};
    headers.forEach(header => {
        dataFrame[header] = [];
    });

    for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        const values = lines[i].split(',').map(v => v.trim());
        if (values.length !== headers.length) {
            console.warn(`Skipping malformed row ${i + 1}: Expected ${headers.length} columns, but found ${values.length}`);
            continue;
        }

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
    if (!Array.isArray(jsonData) || jsonData.length === 0) {
        throw new Error("JSON must be a non-empty array of objects.");
    }

    const headers = Object.keys(jsonData[0]);
    const dataFrame: DataFrame = {};
    headers.forEach(header => {
        dataFrame[header] = [];
    });

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

class NumUtils {
    static mean(arr: number[]): number {
        if (arr.length === 0) return 0;
        return arr.reduce((a, b) => a + b, 0) / arr.length;
    }
    static stdDev(arr: number[]): number {
        if (arr.length < 2) return 0;
        const mu = this.mean(arr);
        const diffSq = arr.map(x => (x - mu) ** 2);
        return Math.sqrt(this.mean(diffSq));
    }
}

export default function DataTab({ activeDataFrame, setActiveDataFrame }: DataTabProps) {
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [profile, setProfile] = useState<DataProfile | null>(null);
  const { toast } = useToast();
  const [classificationPrompt, setClassificationPrompt] = useState('A dataset of 50 customers for churn prediction, with features like age, monthly_bill, tenure_months, and a binary churn status.');
  const [clusteringPrompt, setClusteringPrompt] = useState('A dataset of 100 mall shoppers for segmentation, with features for annual_income_k, and spending_score (1-100).');
  const [fileName, setFileName] = useState('');

  const processDataFrame = (df: DataFrame) => {
    setActiveDataFrame(df);
    const newProfile = generateProfile(df);
    setProfile(newProfile);
    setLoadingAction(null);
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const isCsv = file.type === "text/csv" || file.name.endsWith('.csv');
    const isJson = file.type === "application/json" || file.name.endsWith('.json');

    if (!isCsv && !isJson) {
        toast({ variant: 'destructive', title: 'Invalid File', description: 'Please upload a valid CSV or JSON file.' });
        return;
    }

    setLoadingAction('upload');
    const reader = new FileReader();

    reader.onload = (e) => {
        try {
            const text = e.target?.result as string;
            const df = isCsv ? parseCSV(text) : parseJSON(text);
            processDataFrame(df);
            toast({ title: 'Success', description: `Loaded ${file.name} and processed.` });
        } catch (error) {
            const message = error instanceof Error ? error.message : "An unknown error occurred during parsing.";
            toast({ variant: 'destructive', title: 'Parsing Error', description: message });
            setLoadingAction(null);
        }
    };
    
    reader.onerror = () => {
        toast({ variant: 'destructive', title: 'File Read Error', description: 'Failed to read the file.' });
        setLoadingAction(null);
    }

    reader.readAsText(file);
    event.target.value = '';
  };
  
  const handleGenerateData = async (prompt: string, type: 'classification' | 'clustering') => {
      if (!prompt.trim()) {
          toast({ variant: 'destructive', title: 'Error', description: 'Prompt cannot be empty.' });
          return;
      }
      setLoadingAction(type);

      const result = await handleDataGeneration({ prompt, format: 'json' });

      if (result.success && result.data) {
          try {
              const df = parseJSON(result.data);
              processDataFrame(df);
              toast({ title: 'Success', description: `Generated ${type} data from AI.` });
          } catch (error) {
              const message = error instanceof Error ? error.message : "An unknown error occurred during parsing.";
              toast({ variant: 'destructive', title: 'Parsing Error', description: message });
              setLoadingAction(null);
          }
      } else {
          toast({ variant: 'destructive', title: 'AI Generation Error', description: result.error });
          setLoadingAction(null);
      }
  };

  const handleMissingValues = (strategy: 'mean' | 'median' | 'mode' | 'drop') => {
    if (!activeDataFrame) return;
    setLoadingAction('process');

    let newDf = JSON.parse(JSON.stringify(activeDataFrame)); // Deep copy
    const headers = Object.keys(newDf);

    if (strategy === 'drop') {
        const rowCount = newDf[headers[0]].length;
        const validRows = new Array(rowCount).fill(true);
        
        for (const header of headers) {
            for (let i = 0; i < rowCount; i++) {
                if (newDf[header][i] === null || newDf[header][i] === undefined || String(newDf[header][i]).trim() === '') {
                    validRows[i] = false;
                }
            }
        }
        
        const updatedDf: DataFrame = {};
        headers.forEach(h => {
            updatedDf[h] = newDf[h].filter((_: any, i: number) => validRows[i]);
        });
        newDf = updatedDf;
        
    } else {
        headers.forEach(header => {
            const column = newDf[header];
            const numericColumn = column.filter((v: any) => typeof v === 'number' && !isNaN(v)) as number[];
            const isNumeric = numericColumn.length / column.length > 0.5;

            let fillValue: string | number;

            if (isNumeric) {
                if (strategy === 'mean') {
                    fillValue = NumUtils.mean(numericColumn);
                } else if (strategy === 'median') {
                    if (numericColumn.length === 0) { fillValue = 0; }
                    else {
                        const sorted = [...numericColumn].sort((a,b) => a-b);
                        const mid = Math.floor(sorted.length / 2);
                        fillValue = sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid-1] + sorted[mid]) / 2;
                    }
                } else { // mode
                    if (numericColumn.length === 0) { fillValue = 0; }
                    else {
                      const counts = numericColumn.reduce((acc, val) => acc.set(val, (acc.get(val) || 0) + 1), new Map());
                      fillValue = [...counts.entries()].reduce((a, b) => b[1] > a[1] ? b : a)[0];
                    }
                }
            } else { // categorical
                const nonNullValues = column.filter((v: any) => v !== null && v !== undefined && String(v).trim() !== '');
                if (nonNullValues.length === 0) { fillValue = ''; }
                else {
                  const counts = nonNullValues.reduce((acc, val) => acc.set(val, (acc.get(val) || 0) + 1), new Map());
                  fillValue = [...counts.entries()].reduce((a, b) => b[1] > a[1] ? b : a)[0];
                }
            }
            newDf[header] = column.map((v: any) => (v === null || v === undefined || String(v).trim() === '') ? fillValue : v);
        });
    }

    processDataFrame(newDf);
    toast({ title: 'Success', description: `Applied '${strategy}' strategy to handle missing values.` });
};
  
  const downloadFile = (content: string, fileName: string, mimeType: string) => {
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
  };

  const handleDownloadCSV = () => {
      if (!activeDataFrame) return;
      const headers = Object.keys(activeDataFrame);
      const rows = Array.from({ length: activeDataFrame[headers[0]].length }).map((_, i) =>
          headers.map(h => {
            let val = activeDataFrame[h][i];
            if (typeof val === 'string' && val.includes(',')) return `"${val}"`;
            return val;
          })
      );
      const csvContent = [
          headers.join(','),
          ...rows.map(row => row.join(','))
      ].join('\n');
      downloadFile(csvContent, 'processed_data.csv', 'text/csv;charset=utf-8;');
  };

  const handleDownloadJSON = () => {
      if (!activeDataFrame) return;
      const headers = Object.keys(activeDataFrame);
      const numRows = activeDataFrame[headers[0]].length;
      const jsonArray = [];
      for (let i = 0; i < numRows; i++) {
          const rowObject: Record<string, any> = {};
          for (const header of headers) {
              rowObject[header] = activeDataFrame[header][i];
          }
          jsonArray.push(rowObject);
      }
      const jsonContent = JSON.stringify(jsonArray, null, 2);
      downloadFile(jsonContent, 'processed_data.json', 'application/json;charset=utf-8;');
  };

  const handleSaveToGallery = () => {
    if (!activeDataFrame || !fileName.trim()) {
        toast({ variant: 'destructive', title: 'Error', description: 'File name cannot be empty and data must be loaded.' });
        return;
    }

    try {
        const headers = Object.keys(activeDataFrame);
        const numRows = activeDataFrame[headers[0]].length;
        const jsonArray = [];
        for (let i = 0; i < numRows; i++) {
            const rowObject: Record<string, any> = {};
            for (const header of headers) {
                rowObject[header] = activeDataFrame[header][i];
            }
            jsonArray.push(rowObject);
        }
        const jsonContent = JSON.stringify(jsonArray, null, 2);

        const currentGallery = JSON.parse(localStorage.getItem('fileGallery') || '[]');
        const newFile = {
            name: `${fileName.trim()}.json`,
            content: jsonContent,
            createdAt: new Date().toISOString()
        };

        if (currentGallery.some((file: {name: string}) => file.name === newFile.name)) {
            toast({ variant: 'destructive', title: 'Error', description: 'A file with this name already exists in the gallery.' });
            return;
        }

        const updatedGallery = [...currentGallery, newFile];
        localStorage.setItem('fileGallery', JSON.stringify(updatedGallery));
        toast({ title: 'Success', description: `Saved "${newFile.name}" to your file gallery.` });
        setFileName('');
    } catch (error) {
         toast({ variant: 'destructive', title: 'Save Error', description: 'Could not save to file gallery. It might be full.' });
    }
  };
  
  const generateProfile = (df: DataFrame): DataProfile => {
    const newProfile: DataProfile = {};
    const headers = Object.keys(df);
    
    headers.forEach(header => {
        const column = df[header];
        if (!column || column.length === 0) return;
        const numericColumn = column.filter(v => typeof v === 'number') as number[];

        if (numericColumn.length > column.length * 0.5) { // Heuristic for numeric
            newProfile[header] = {
                type: 'numeric',
                stats: {
                    Mean: NumUtils.mean(numericColumn).toFixed(2),
                    StdDev: NumUtils.stdDev(numericColumn).toFixed(2),
                    Min: Math.min(...numericColumn),
                    Max: Math.max(...numericColumn),
                    Missing: column.length - numericColumn.length
                }
            };
        } else {
             const missingCount = column.filter(v => v === null || v === undefined || String(v).trim() === '').length;
             newProfile[header] = {
                type: 'categorical',
                stats: {
                    'Unique Values': [...new Set(column)].length,
                    'Missing': missingCount
                }
            };
        }
    });
    return newProfile;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Load Data</CardTitle>
          <CardDescription>Upload a CSV or JSON file from your computer to begin analysis.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline" disabled={!!loadingAction}>
              <Label htmlFor="file-upload" className="cursor-pointer">
                  {loadingAction === 'upload' ? (
                      <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          <span>Processing...</span>
                      </>
                  ) : (
                      <>
                          <Upload className="mr-2" />
                          <span>Upload File (CSV or JSON)</span>
                      </>
                  )}
              </Label>
          </Button>
          <Input 
              id="file-upload" 
              type="file" 
              className="hidden" 
              accept=".csv,text/csv,application/json,.json"
              onChange={handleFileUpload}
              disabled={!!loadingAction}
          />
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Generate Data with AI</CardTitle>
          <CardDescription>Describe the dataset you want to generate. The AI will create a JSON array of objects that will be loaded into the app.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
            <div className="space-y-2">
                <Label htmlFor="classification-prompt">Classification Data Prompt</Label>
                <Textarea
                    id="classification-prompt"
                    placeholder="e.g., Customer churn with age, usage, and plan type"
                    value={classificationPrompt}
                    onChange={(e) => setClassificationPrompt(e.target.value)}
                    rows={3}
                    disabled={!!loadingAction}
                />
                <Button onClick={() => handleGenerateData(classificationPrompt, 'classification')} disabled={!!loadingAction || !classificationPrompt.trim()} variant="secondary">
                    {loadingAction === 'classification' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Generate Classification Data
                </Button>
            </div>
            <div className="space-y-2">
                <Label htmlFor="clustering-prompt">Clustering Data Prompt</Label>
                <Textarea
                    id="clustering-prompt"
                    placeholder="e.g., Mall customer segmentation with income and spending score"
                    value={clusteringPrompt}
                    onChange={(e) => setClusteringPrompt(e.target.value)}
                    rows={3}
                    disabled={!!loadingAction}
                />
                <Button onClick={() => handleGenerateData(clusteringPrompt, 'clustering')} disabled={!!loadingAction || !clusteringPrompt.trim()} variant="secondary">
                    {loadingAction === 'clustering' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Generate Clustering Data
                </Button>
            </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
            <CardTitle>Process Data</CardTitle>
            <CardDescription>Clean and transform your dataset before modeling. Operations are applied to the current dataframe.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
            <div>
                <Label className="font-semibold text-base">Handle Missing Values</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                    <Button variant="secondary" onClick={() => handleMissingValues('mean')} disabled={!activeDataFrame || !!loadingAction}>Fill with Mean</Button>
                    <Button variant="secondary" onClick={() => handleMissingValues('median')} disabled={!activeDataFrame || !!loadingAction}>Fill with Median</Button>
                    <Button variant="secondary" onClick={() => handleMissingValues('mode')} disabled={!activeDataFrame || !!loadingAction}>Fill with Mode</Button>
                    <Button onClick={() => handleMissingValues('drop')} variant="destructive" disabled={!activeDataFrame || !!loadingAction}>Drop Rows</Button>
                </div>
            </div>
        </CardContent>
      </Card>

      {activeDataFrame && (
        <div className="space-y-6 animate-in fade-in-50 duration-500">
            <Card>
              <CardHeader>
                <CardTitle>Export Data</CardTitle>
                <CardDescription>Download the currently active (and processed) dataframe or save it to your gallery.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-4">
                <Button onClick={handleDownloadCSV} disabled={!activeDataFrame || !!loadingAction} variant="outline">
                    <Download className="mr-2" />
                    Download as CSV
                </Button>
                <Button onClick={handleDownloadJSON} disabled={!activeDataFrame || !!loadingAction} variant="outline">
                    <Download className="mr-2" />
                    Download as JSON
                </Button>
                 <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="outline" disabled={!activeDataFrame || !!loadingAction}><Save className="mr-2" /> Save to Gallery</Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Save to File Gallery</AlertDialogTitle>
                            <AlertDialogDescription>
                                Enter a name for your file. It will be saved as a JSON file in your gallery.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <Input 
                            placeholder="e.g., processed-customer-data"
                            value={fileName}
                            onChange={(e) => setFileName(e.target.value)}
                        />
                        <AlertDialogFooter>
                            <AlertDialogCancel onClick={() => setFileName('')}>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleSaveToGallery} disabled={!fileName.trim()}>Save</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
              </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Data Preview</CardTitle>
                    <CardDescription>First 10 rows of the loaded dataset.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    {Object.keys(activeDataFrame).map(key => <TableHead key={key}>{key}</TableHead>)}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {Array.from({ length: Math.min(10, activeDataFrame[Object.keys(activeDataFrame)[0]].length) }).map((_, rowIndex) => (
                                    <TableRow key={rowIndex}>
                                        {Object.keys(activeDataFrame).map(key => (
                                            <TableCell key={key}>{String(activeDataFrame[key][rowIndex])}</TableCell>
                                        ))}
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Data Profile</CardTitle>
                    <CardDescription>Statistical summary of the dataset features.</CardDescription>
                </CardHeader>
                <CardContent>
                    {profile && (
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {Object.entries(profile).map(([header, data]) => (
                                <Card key={header} className="bg-muted/50">
                                    <CardHeader className="py-4">
                                        <CardTitle className="text-lg">{header}</CardTitle>
                                        <CardDescription>Type: {data.type}</CardDescription>
                                    </CardHeader>
                                    <CardContent className="pb-4">
                                        <ul className="space-y-1 text-sm">
                                        {Object.entries(data.stats).map(([stat, value]) => (
                                            <li key={stat} className="flex justify-between">
                                                <span className="text-muted-foreground">{stat}:</span>
                                                <span className="font-semibold">{String(value)}</span>
                                            </li>
                                        ))}
                                        </ul>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
      )}
    </div>
  );
}
