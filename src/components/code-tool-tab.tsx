"use client";

import React, { useState, useTransition } from 'react';
import { handleDataGeneration } from '@/app/actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Braces, Save, Download, FileText } from 'lucide-react';
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
} from "@/components/ui/alert-dialog"
import { Input } from './ui/input';


export default function DataGeneratorTab() {
    const [isPending, startTransition] = useTransition();
    const [prompt, setPrompt] = useState('Generate a dataset of 50 video game characters, including fields like name, character_class, primary_weapon, strength, agility, and a short bio.');
    const [generatedData, setGeneratedData] = useState('');
    const [generatedFormat, setGeneratedFormat] = useState<'json' | 'csv' | null>(null);
    const [fileName, setFileName] = useState('');
    const { toast } = useToast();

    const handleGenerate = (format: 'json' | 'csv') => {
        if (!prompt.trim()) {
            toast({ variant: 'destructive', title: 'Error', description: 'Prompt cannot be empty.' });
            return;
        }

        startTransition(async () => {
            setGeneratedData('');
            setGeneratedFormat(null);
            const result = await handleDataGeneration({ prompt, format });
            if (result.success) {
                let displayData = result.data;
                if (format === 'json') {
                    try {
                        // Prettify the JSON for display
                        const parsed = JSON.parse(result.data);
                        displayData = JSON.stringify(parsed, null, 2);
                    } catch {
                        // fallback to raw string if parsing fails
                    }
                }
                setGeneratedData(displayData);
                setGeneratedFormat(format);
            } else {
                toast({ variant: 'destructive', title: 'Data Generation Error', description: result.error });
            }
        });
    };
    
    const handleExport = () => {
        if (!generatedData || !generatedFormat) return;

        const mimeType = generatedFormat === 'json' ? 'application/json;charset=utf-8;' : 'text/csv;charset=utf-8;';
        const fileExtension = generatedFormat;
        const blob = new Blob([generatedData], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `generated-data.${fileExtension}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast({ title: 'Success', description: `Data exported as generated-data.${fileExtension}` });
    };

    const handleSaveToGallery = () => {
        if (!generatedData || !fileName.trim() || generatedFormat !== 'json') {
            toast({ variant: 'destructive', title: 'Error', description: 'Can only save JSON files to the gallery. Please generate JSON data and provide a file name.' });
            return;
        }

        try {
            const currentGallery = JSON.parse(localStorage.getItem('fileGallery') || '[]');
            const newFile = {
                name: `${fileName.trim()}.json`,
                content: generatedData,
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

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>AI Data Generator</CardTitle>
                    <CardDescription>Generate elaborate datasets in JSON or CSV format by providing a detailed prompt.</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={(e) => e.preventDefault()} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="prompt">Data Generation Prompt</Label>
                            <Textarea
                                id="prompt"
                                placeholder="Describe the data you want to generate..."
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                rows={6}
                                disabled={isPending}
                            />
                        </div>
                        <div className="flex flex-wrap gap-4">
                            <Button onClick={() => handleGenerate('json')} disabled={isPending || !prompt.trim()}>
                                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                <Braces className="mr-2" /> Generate JSON
                            </Button>
                             <Button onClick={() => handleGenerate('csv')} disabled={isPending || !prompt.trim()} variant="secondary">
                                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                <FileText className="mr-2" /> Generate CSV
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>

            {(isPending || generatedData) && (
                <Card className="animate-in fade-in-50 duration-500">
                    <CardHeader className="flex flex-row items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                            {generatedFormat === 'csv' ? <FileText className="h-6 w-6" /> : <Braces className="h-6 w-6" />}
                            <CardTitle>Generated {generatedFormat?.toUpperCase()}</CardTitle>
                        </div>
                        {!isPending && generatedData && (
                            <div className="flex gap-2">
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button variant="outline" size="sm" disabled={generatedFormat !== 'json'} title={generatedFormat !== 'json' ? 'Can only save JSON to gallery' : 'Save to Gallery'}><Save className="mr-2" /> Save to Gallery</Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Save to File Gallery</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                Enter a name for your new file. It will be saved with a .json extension.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <Input 
                                            placeholder="e.g., user-data-v1"
                                            value={fileName}
                                            onChange={(e) => setFileName(e.target.value)}
                                        />
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                            <AlertDialogAction onClick={handleSaveToGallery} disabled={!fileName.trim()}>Save</AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                                <Button variant="secondary" size="sm" onClick={handleExport}>
                                    <Download className="mr-2" />
                                    Export File
                                </Button>
                            </div>
                        )}
                    </CardHeader>
                    <CardContent>
                        {isPending ? (
                            <div className="flex items-center space-x-2 text-muted-foreground">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                <span>Generating... this may take a moment for large datasets.</span>
                            </div>
                        ) : (
                            <pre className="text-sm bg-muted/50 p-4 rounded-md overflow-x-auto max-h-[600px]">
                                <code>{generatedData}</code>
                            </pre>
                        )}
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
