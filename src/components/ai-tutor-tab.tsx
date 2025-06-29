"use client";

import React, { useState, useTransition } from 'react';
import { handleAiTutorQuery } from '@/app/actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Bot } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function AiTutorTab() {
    const [isPending, startTransition] = useTransition();
    const [query, setQuery] = useState('');
    const [response, setResponse] = useState('');
    const { toast } = useToast();

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!query.trim()) {
            toast({ variant: 'destructive', title: 'Error', description: 'Query cannot be empty.' });
            return;
        }

        startTransition(async () => {
            setResponse('');
            const result = await handleAiTutorQuery({ query, context: "User is working in the Synapse ML Toolkit UI." });
            if (result.success) {
                setResponse(result.response);
            } else {
                toast({ variant: 'destructive', title: 'AI Tutor Error', description: result.error });
            }
        });
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>AI Assistant</CardTitle>
                    <CardDescription>Ask the AI tutor a question about machine learning concepts, algorithms, or best practices.</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <Textarea
                            placeholder="e.g., 'Explain the difference between K-Means and DBSCAN...'"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            rows={4}
                            disabled={isPending}
                        />
                        <Button type="submit" disabled={isPending || !query.trim()}>
                            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Ask Tutor
                        </Button>
                    </form>
                </CardContent>
            </Card>
            
            {(isPending || response) && (
                <Card className="animate-in fade-in-50 duration-500">
                    <CardHeader className="flex flex-row items-center gap-2">
                        <Bot className="h-6 w-6" />
                        <div>
                            <CardTitle>AI Tutor Response</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {isPending ? (
                            <div className="flex items-center space-x-2 text-muted-foreground">
                                <Loader2 className="h-4 w-4 animate-spin"/>
                                <span>Thinking...</span>
                            </div>
                        ) : (
                            <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-2 prose-headings:my-3">
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>{response}</ReactMarkdown>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
