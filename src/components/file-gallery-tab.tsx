"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Archive, Download, Trash2, Eye, UploadCloud } from 'lucide-react';
import type { DataFrame } from '@/lib/types';
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';


interface FileGalleryTabProps {
  setActiveDataFrame: React.Dispatch<React.SetStateAction<DataFrame | null>>;
}

type SavedFile = {
    name: string;
    content: string;
    createdAt: string;
};

const parseJSON = (text: string): DataFrame => {
    const jsonData = JSON.parse(text);
    if (!Array.isArray(jsonData) || jsonData.length === 0) {
        throw new Error("JSON must be a non-empty array of objects.");
    }

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

export default function FileGalleryTab({ setActiveDataFrame }: FileGalleryTabProps) {
    const [savedFiles, setSavedFiles] = useState<SavedFile[]>([]);
    const { toast } = useToast();
    
    useEffect(() => {
        loadFilesFromStorage();
        // The 'storage' event is fired when a storage area has been changed in the context of another document.
        // This is useful for syncing tabs, but we'll also call it manually when we make changes.
        window.addEventListener('storage', loadFilesFromStorage);
        return () => window.removeEventListener('storage', loadFilesFromStorage);
    }, []);

    const loadFilesFromStorage = () => {
        try {
            const files = JSON.parse(localStorage.getItem('fileGallery') || '[]');
            setSavedFiles(files.sort((a: SavedFile, b: SavedFile) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
        } catch {
            toast({ variant: 'destructive', title: 'Error', description: 'Could not load files from local storage.' });
            setSavedFiles([]);
        }
    };

    const handleLoadData = (fileContent: string, fileName: string) => {
        try {
            const df = parseJSON(fileContent);
            setActiveDataFrame(df);
            toast({ title: 'Success', description: `Loaded "${fileName}" into the Data tab.` });
        } catch (error) {
            const message = error instanceof Error ? error.message : "Unknown parsing error.";
            toast({ variant: 'destructive', title: `Error loading ${fileName}`, description: message });
        }
    };

    const handleExport = (content: string, name: string) => {
        const blob = new Blob([content], { type: 'application/json;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleDelete = (fileName: string) => {
        try {
            const updatedFiles = savedFiles.filter(file => file.name !== fileName);
            localStorage.setItem('fileGallery', JSON.stringify(updatedFiles));
            loadFilesFromStorage(); // Re-read from storage to update state
            toast({ title: 'Success', description: `Deleted "${fileName}" from gallery.` });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'Could not delete the file.' });
        }
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>File Gallery</CardTitle>
                    <CardDescription>Manage your generated JSON files. Files are saved in your browser's local storage.</CardDescription>
                </CardHeader>
                <CardContent>
                    {savedFiles.length === 0 ? (
                        <div className="text-center text-muted-foreground py-10 border-2 border-dashed rounded-lg">
                            <Archive className="mx-auto h-12 w-12" />
                            <p className="mt-4">Your gallery is empty.</p>
                            <p>Go to the "JSON Generator" tab to create and save new files.</p>
                        </div>
                    ) : (
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {savedFiles.map(file => (
                                <Card key={file.name} className="flex flex-col">
                                    <CardHeader className="pb-4">
                                        <CardTitle className="text-lg truncate" title={file.name}>{file.name}</CardTitle>

                                        <CardDescription>
                                            Saved on: {new Date(file.createdAt).toLocaleDateString()}
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="flex-grow flex flex-col justify-end gap-2">
                                         <Dialog>
                                            <DialogTrigger asChild>
                                                <Button variant="outline" size="sm"><Eye className="mr-2" />View</Button>
                                            </DialogTrigger>
                                            <DialogContent className="max-w-3xl">
                                                <DialogHeader>
                                                    <DialogTitle>{file.name}</DialogTitle>
                                                </DialogHeader>
                                                <pre className="mt-2 text-sm bg-muted/50 p-4 rounded-md overflow-x-auto max-h-[60vh]">
                                                    <code>{file.content}</code>
                                                </pre>
                                            </DialogContent>
                                        </Dialog>
                                        <div className="flex gap-2">
                                            <Button size="sm" className="flex-1" onClick={() => handleLoadData(file.content, file.name)}><UploadCloud className="mr-2" />Load Data</Button>
                                            <Button size="sm" variant="secondary" onClick={() => handleExport(file.content, file.name)}><Download className="mr-2" /></Button>
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button size="sm" variant="destructive"><Trash2 /></Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                        <AlertDialogDescription>This will permanently delete "{file.name}". This action cannot be undone.</AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                        <AlertDialogAction onClick={() => handleDelete(file.name)}>Delete</AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
