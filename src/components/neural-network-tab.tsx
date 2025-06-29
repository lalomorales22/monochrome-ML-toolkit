
"use client";

import React, { useState, useMemo, useEffect } from 'react';
import type { DataFrame, NeuralNetworkModel, Matrix, Vector, ChartConfig } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Legend, Tooltip } from "recharts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface NeuralNetworkTabProps {
  activeDataFrame: DataFrame;
  activeModel: NeuralNetworkModel | null;
  setActiveModel: React.Dispatch<React.SetStateAction<NeuralNetworkModel | null>>;
}

// A more robust, corrected set of numpy-like matrix operations
const np = {
    random: (rows: number, cols: number): Matrix => Array.from({ length: rows }, () => Array.from({ length: cols }, () => Math.random() * 0.1 - 0.05)),
    zeros: (rows: number, cols: number): Matrix => Array.from({ length: rows }, () => Array(cols).fill(0)),
    dot: (a: Matrix, b: Matrix): Matrix => a.map((row) => b[0].map((_, j) => row.reduce((sum, elm, k) => sum + (elm * b[k][j]), 0))),
    add: (a: Matrix, b: Matrix | number): Matrix => {
        if (typeof b === 'number') return a.map(row => row.map(val => val + b));
        if (b.length === 1 && a[0].length === b[0].length) return a.map(row => row.map((val, j) => val + b[0][j])); // Broadcasting
        return a.map((row, i) => row.map((val, j) => val + b[i][j]));
    },
    subtract: (a: Matrix, b: Matrix | number): Matrix => {
        if (typeof b === 'number') return a.map(row => row.map(val => val - b));
        if (b.length === 1 && a[0].length === b[0].length) return a.map(row => row.map((val, j) => val - b[0][j])); // Broadcasting
        return a.map((row, i) => row.map((val, j) => val - b[i][j]));
    },
    multiply: (a: Matrix, b: Matrix | number): Matrix => {
        if (typeof b === 'number') return a.map(row => row.map(val => val * b));
        return a.map((row, i) => row.map((val, j) => val * b[i][j]));
    },
    transpose: (m: Matrix): Matrix => m[0] ? m[0].map((_, colIndex) => m.map(row => row[colIndex])) : [],
    exp: (m: Matrix): Matrix => m.map(row => row.map(val => Math.exp(val))),
    log: (m: Matrix): Matrix => m.map(row => row.map(val => Math.log(val + 1e-9))),
    sum: (m: Matrix, axis?: number, keepdims = false) => {
        if (m.length === 0) return keepdims ? [[]] : [];
        if (axis === 0) { // Column-wise sum
            const res = m[0].map((_, colIndex) => m.reduce((sum, row) => sum + row[colIndex], 0));
            return keepdims ? [res] : res;
        }
        if (axis === 1) { // Row-wise sum
            const res = m.map(row => row.reduce((s, v) => s + v, 0));
            return keepdims ? res.map(v => [v]) : res;
        }
        return [[m.flat().reduce((s, v) => s + v, 0)]];
    },
    max: (m: Matrix, axis?: number, keepdims = false): Matrix => {
        if (axis === 1) { // max of each row
            const res = m.map(row => Math.max(...row));
            return keepdims ? res.map(v => [v]) : [res];
        }
        return [[Math.max(...m.flat())]];
    },
    divide: (a: Matrix | number, b: Matrix | number): Matrix => {
        if (typeof a === 'number') {
            const denominator = b as Matrix;
            return denominator.map(row => row.map(val => a / (val + 1e-9)));
        }
        const numerator = a as Matrix;
        if (typeof b === 'number') {
            return numerator.map(row => row.map(val => val / (b + 1e-9)));
        }
        if (b.length === 1) { // Broadcasting
            return numerator.map(row => row.map((val, j) => val / (b[0][j] + 1e-9)));
        }
        return numerator.map((row, i) => row.map((val, j) => val / (b[i][j] + 1e-9)));
    },
    mean: (m: Matrix, axis?: number) => {
        if (m.length === 0) return 0;
        if (axis === 0) return (np.sum(m, 0) as number[]).map((s: number) => s / m.length);
        if (axis === 1) return (np.sum(m, 1) as number[]).map((s: number) => s / m[0].length);
        return np.sum(m)[0][0] / m.flat().length;
    },
    power: (m: Matrix, exp: number) => m.map(row => row.map(val => val ** exp)),
    maximum: (a: number, b: Matrix) => b.map(row => row.map(val => Math.max(a, val))),
    ones_like: (m: Matrix) => m.map(row => Array(row.length).fill(1)),
    argmax: (m: Matrix): Vector => m.map(row => row.indexOf(Math.max(...row))),
    clip: (m: Matrix, min: number, max: number): Matrix => m.map(row => row.map(val => Math.max(min, Math.min(val, max)))),
};


class NNUtils {
    static activate(x: Matrix, activation: string): Matrix {
        if (activation === 'sigmoid') {
            const neg_x = np.multiply(x, -1);
            const exp_x = np.exp(np.clip(neg_x, -500, 500));
            return np.divide(1, np.add(exp_x, 1));
        }
        if (activation === 'tanh') {
            const exp_x = np.exp(x);
            const exp_neg_x = np.exp(np.multiply(x, -1));
            return np.divide(np.subtract(exp_x, exp_neg_x), np.add(exp_x, exp_neg_x));
        }
        if (activation === 'relu') return np.maximum(0, x);
        return x; // Linear
    }

    static activateDerivative(x: Matrix, activation: string): Matrix {
        if (activation === 'sigmoid') return np.multiply(x, np.subtract(1, x));
        if (activation === 'tanh') return np.subtract(1, np.power(x, 2));
        if (activation === 'relu') return x.map(row => row.map(val => val > 0 ? 1 : 0));
        return np.ones_like(x); // Linear
    }

    static softmax(z: Matrix): Matrix {
        const max_z = np.max(z, 1, true);
        const expZ = np.exp(np.subtract(z, max_z));
        const sumExpZ = np.sum(expZ, 1, true) as Matrix;
        return np.divide(expZ, sumExpZ);
    }
}

export default function NeuralNetworkTab({ activeDataFrame, activeModel, setActiveModel }: NeuralNetworkTabProps) {
    const [isTraining, setIsTraining] = useState(false);
    const [features, setFeatures] = useState('');
    const [target, setTarget] = useState('');
    const [learningRate, setLearningRate] = useState(0.01);
    const [epochs, setEpochs] = useState(1000);
    const [hiddenLayers, setHiddenLayers] = useState("20,10");
    const [activation, setActivation] = useState("relu");
    const { toast } = useToast();

    useEffect(() => {
        if (activeDataFrame) {
          const columns = Object.keys(activeDataFrame);
          const potentialTarget = columns.find(c => ['target', 'species', 'label', 'class'].includes(c.toLowerCase())) || columns[columns.length - 1];
          const potentialFeatures = columns.filter(c => c !== potentialTarget && activeDataFrame[c].every(v => typeof v === 'number'));
          
          setTarget(potentialTarget || '');
          setFeatures(potentialFeatures.join(','));
        }
    }, [activeDataFrame]);
    
    const chartData = useMemo(() => {
        if (!activeModel) return [];
        if (activeModel.problemType === 'classification') {
            return activeModel.costs.map((cost, i) => ({ epoch: i + 1, cost: cost, metric: activeModel.accuracies![i] }));
        }
        return activeModel.costs.map((cost, i) => ({ epoch: i + 1, cost: cost, metric: activeModel.rSquared! }));
    }, [activeModel]);

    const chartConfig: ChartConfig = {
        cost: { label: "Cost", color: "hsl(var(--chart-1))" },
        metric: { label: activeModel?.problemType === 'classification' ? 'Accuracy' : 'R-Squared', color: "hsl(var(--chart-2))" },
    };

    const handleTrain = async () => {
        setIsTraining(true);
        setActiveModel(null);

        try {
            // Data Prep
            const featureCols = features.split(',').map(f => f.trim()).filter(Boolean);
            if (!featureCols.length || !target) throw new Error("Feature and target columns must be defined.");
            
            const X_raw = featureCols.map(f => {
                if(!activeDataFrame[f]) throw new Error(`Feature column "${f}" not found.`);
                return activeDataFrame[f] as number[]
            });
            if(!activeDataFrame[target]) throw new Error(`Target column "${target}" not found.`);
            let y_raw = activeDataFrame[target] as Vector;
            
            // Standardize X
            const means = X_raw.map(col => col.reduce((a,b) => a+b, 0) / col.length);
            const stds = X_raw.map((col, i) => Math.sqrt(col.map(x => (x-means[i])**2).reduce((a,b) => a+b, 0) / col.length));
            let X = np.transpose(X_raw.map((col, i) => col.map(x => stds[i] === 0 ? 0 : (x - means[i]) / stds[i])));
            
            // Problem type detection
            const uniqueY = [...new Set(y_raw)];
            const isClassification = uniqueY.length <= 10 && uniqueY.every(v => typeof v === 'number' && Number.isInteger(v));
            let y: Matrix;
            let outputSize: number;
            
            if (isClassification) {
                const nClasses = uniqueY.length;
                const classMap = Object.fromEntries(uniqueY.sort().map((v, i) => [v, i]));
                const y_mapped = y_raw.map(v => classMap[v]);

                if (nClasses > 2) { // One-hot encode for multi-class
                    y = y_mapped.map(val => Array.from({length: nClasses}, (_,i) => i === val ? 1 : 0));
                    outputSize = nClasses;
                } else { // Binary
                    y = (y_mapped as number[]).map(v => [v]);
                    outputSize = 1;
                }
            } else { // Regression
                y = (y_raw as number[]).map(v => [v]);
                outputSize = 1;
            }

            // Architecture
            const layerSizes = [X[0].length, ...hiddenLayers.split(',').map(Number).filter(n=>n>0), outputSize];
            const architecture = layerSizes;
            let weights: Matrix[] = [];
            let biases: Matrix[] = [];
            for (let i = 0; i < layerSizes.length - 1; i++) {
                weights.push(np.random(layerSizes[i], layerSizes[i+1]));
                biases.push(np.zeros(1, layerSizes[i+1]));
            }

            const costs: number[] = [];
            const accuracies: number[] = [];
            let lastRSquared = 0;
            
            // Training Loop
            for (let i = 0; i < epochs; i++) {
                // Forward pass
                let activations: Matrix[] = [X];
                let current_a = X;
                for (let l = 0; l < weights.length; l++) {
                    let z = np.add(np.dot(current_a, weights[l]), biases[l]);
                    if (l === weights.length - 1) { // Output layer
                        if (isClassification && outputSize > 2) current_a = NNUtils.softmax(z);
                        else if (isClassification) current_a = NNUtils.activate(z, 'sigmoid');
                        else current_a = z; // Linear for regression
                    } else {
                        current_a = NNUtils.activate(z, activation);
                    }
                    activations.push(current_a);
                }
                const output = activations[activations.length - 1];

                // Loss
                if (isClassification) {
                    const cost = -np.mean(np.multiply(y, np.log(output)));
                    costs.push(cost as number);
                    const predictions = np.argmax(output);
                    const trueLabels = np.argmax(y);
                    accuracies.push(predictions.reduce((acc, p, j) => acc + (p === trueLabels[j] ? 1 : 0), 0) / y.length);
                } else { // Regression
                    const cost = np.mean(np.power(np.subtract(output, y), 2));
                    costs.push(cost as number);
                    const y_mean = np.mean(y);
                    const ss_tot = np.sum(np.power(np.subtract(y, y_mean), 2))[0][0];
                    const ss_res = np.sum(np.power(np.subtract(output, y), 2))[0][0];
                    lastRSquared = 1 - (ss_res / ss_tot);
                }

                // Backward pass
                let error = np.subtract(output, y);
                for (let l = weights.length - 1; l >= 0; l--) {
                    const d_activation = l === weights.length - 1 && isClassification && outputSize > 2 
                        ? error // For softmax, derivative is handled in error
                        : np.multiply(error, NNUtils.activateDerivative(activations[l+1], l === weights.length-1 && isClassification ? 'sigmoid' : activation));

                    const dW = np.dot(np.transpose(activations[l]), d_activation);
                    const db = np.sum(d_activation, 0, true) as Matrix;

                    weights[l] = np.subtract(weights[l], np.multiply(dW, learningRate)) as Matrix;
                    biases[l] = np.subtract(biases[l], np.multiply(db, learningRate)) as Matrix;
                    
                    if (l > 0) {
                        error = np.dot(d_activation, np.transpose(weights[l]));
                    }
                }
            }
            
            const trainedModel: NeuralNetworkModel = {
                architecture, weights, biases, costs, problemType: isClassification ? 'classification' : 'regression',
                predict: (X_pred: Matrix) => { return [] }, // Simplified
            };
            if(isClassification) trainedModel.accuracies = accuracies;
            else trainedModel.rSquared = lastRSquared;

            setActiveModel(trainedModel);
            toast({ title: "Training Complete", description: `Neural Network model trained.` });
        } catch (error) {
            const message = error instanceof Error ? error.message : "An unknown error occurred.";
            toast({ variant: "destructive", title: "Training Error", description: message });
        } finally {
            setIsTraining(false);
        }
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Train Neural Network</CardTitle>
                    <CardDescription>Configure and train a feed-forward neural network from scratch.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="grid gap-2">
                            <Label htmlFor="features">Feature Columns (comma-separated)</Label>
                            <Input id="features" value={features} onChange={(e) => setFeatures(e.target.value)} disabled={isTraining}/>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="target">Target Column</Label>
                            <Input id="target" value={target} onChange={(e) => setTarget(e.target.value)} disabled={isTraining} />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="hiddenLayers">Hidden Layer Sizes (e.g., 20,10)</Label>
                            <Input id="hiddenLayers" value={hiddenLayers} onChange={(e) => setHiddenLayers(e.target.value)} disabled={isTraining}/>
                        </div>
                        <div className="grid gap-2">
                            <Label>Activation Function</Label>
                            <Select value={activation} onValueChange={setActivation} disabled={isTraining}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="relu">ReLU</SelectItem>
                                    <SelectItem value="sigmoid">Sigmoid</SelectItem>
                                    <SelectItem value="tanh">Tanh</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="lr">Learning Rate</Label>
                            <Input id="lr" type="number" value={learningRate} onChange={(e) => setLearningRate(parseFloat(e.target.value))} step="0.001" disabled={isTraining}/>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="epochs">Epochs</Label>
                            <Input id="epochs" type="number" value={epochs} onChange={(e) => setEpochs(parseInt(e.target.value))} disabled={isTraining}/>
                        </div>
                    </div>
                    <Button onClick={handleTrain} disabled={isTraining}>
                        {isTraining && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {isTraining ? 'Training...' : 'Train Model'}
                    </Button>
                </CardContent>
            </Card>

            {isTraining && !activeModel && (
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center space-x-2 text-muted-foreground">
                            <Loader2 className="h-5 w-5 animate-spin" />
                            <span>Training in progress... please wait. This may take a moment.</span>
                        </div>
                    </CardContent>
                </Card>
            )}

            {activeModel && (
                <div className="space-y-6 animate-in fade-in-50 duration-500">
                    <Card>
                        <CardHeader>
                            <CardTitle>Model Performance</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ul className="space-y-2">
                                <li className="flex justify-between"><span>Problem Type:</span> <span className="font-mono">{activeModel.problemType}</span></li>
                                <li className="flex justify-between"><span>Architecture:</span> <span className="font-mono">{activeModel.architecture.join(' → ')}</span></li>
                                <li className="flex justify-between"><span>Final Cost:</span> <span className="font-mono">{activeModel.costs.slice(-1)[0].toFixed(6)}</span></li>
                                {activeModel.problemType === 'classification' ? (
                                    <li className="flex justify-between"><span>Final Accuracy:</span> <span className="font-mono">{activeModel.accuracies!.slice(-1)[0].toFixed(4)}</span></li>
                                ) : (
                                    <li className="flex justify-between"><span>R-Squared:</span> <span className="font-mono">{activeModel.rSquared!.toFixed(4)}</span></li>
                                )}
                            </ul>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle>Training Progress</CardTitle>
                            <CardDescription>Cost and {activeModel.problemType === 'classification' ? 'Accuracy' : 'R-Squared'} over training epochs.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="h-[400px] w-full">
                                <ChartContainer config={chartConfig} className="w-full h-full">
                                    <LineChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="epoch" tick={{ fill: 'hsl(var(--muted-foreground))' }} tickLine={{ stroke: 'hsl(var(--border))' }} />
                                        <YAxis yAxisId="left" tickFormatter={(v) => v.toFixed(3)} tick={{ fill: 'hsl(var(--muted-foreground))' }} tickLine={{ stroke: 'hsl(var(--border))' }} />
                                        <YAxis yAxisId="right" orientation="right" domain={[0, 1]} tickFormatter={(v) => v.toFixed(2)} tick={{ fill: 'hsl(var(--muted-foreground))' }} tickLine={{ stroke: 'hsl(var(--border))' }} />
                                        <Tooltip content={<ChartTooltipContent />} />
                                        <Legend />
                                        <Line yAxisId="left" type="monotone" dataKey="cost" stroke="var(--color-cost)" strokeWidth={2} dot={false} />
                                        <Line yAxisId="right" type="monotone" dataKey="metric" name={chartConfig.metric.label} stroke="var(--color-metric)" strokeWidth={2} dot={false} />
                                    </LineChart>
                                </ChartContainer>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}
