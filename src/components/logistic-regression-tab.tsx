"use client";

import React, { useState, useMemo, useEffect } from 'react';
import type { DataFrame, LogisticRegressionModel, Matrix, Vector, ChartConfig } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Legend, Tooltip } from "recharts";

interface LogisticRegressionTabProps {
  activeDataFrame: DataFrame;
  activeModel: LogisticRegressionModel | null;
  setActiveModel: React.Dispatch<React.SetStateAction<LogisticRegressionModel | null>>;
}

class MathUtils {
    static sigmoid(z: number): number {
        return 1 / (1 + Math.exp(-z));
    }

    static transpose(matrix: Matrix): Matrix {
        if (matrix.length === 0) return [];
        return matrix[0].map((_, colIndex) => matrix.map(row => row[colIndex]));
    }
}

export default function LogisticRegressionTab({ activeDataFrame, activeModel, setActiveModel }: LogisticRegressionTabProps) {
  const [isTraining, setIsTraining] = useState(false);
  const [features, setFeatures] = useState('');
  const [target, setTarget] = useState('');
  const [learningRate, setLearningRate] = useState(0.01);
  const [epochs, setEpochs] = useState(1000);
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
    return activeModel.costs.map((cost, i) => ({
        epoch: i + 1,
        cost: cost,
        accuracy: activeModel.accuracies[i]
    }));
  }, [activeModel]);
  
  const chartConfig: ChartConfig = {
    cost: { label: "Cost", color: "hsl(var(--chart-1))" },
    accuracy: { label: "Accuracy", color: "hsl(var(--chart-2))" },
  };

  const handleTrain = async () => {
    setIsTraining(true);
    setActiveModel(null);
    
    try {
        const featureCols = features.split(',').map(f => f.trim()).filter(f => f);
        if (featureCols.length === 0 || !target) {
            toast({ variant: "destructive", title: "Training Error", description: "Please enter feature and target columns." });
            setIsTraining(false);
            return;
        }

        const X_transposed: Matrix = featureCols.map(f => {
            if (!activeDataFrame[f]) throw new Error(`Feature '${f}' not found.`);
            if (activeDataFrame[f].some(v => typeof v !== 'number')) throw new Error(`Feature '${f}' must be numeric.`);
            return activeDataFrame[f] as number[];
        });
        
        let y_raw = activeDataFrame[target] as Vector;
        if (!y_raw) throw new Error(`Target column '${target}' not found.`);
        
        // Encode target variable to be binary (0 or 1)
        const uniqueLabels = [...new Set(y_raw)];
        if (uniqueLabels.length !== 2) {
            throw new Error("Logistic Regression requires a binary target variable with exactly 2 unique classes.");
        }
        const y = y_raw.map(val => (val === uniqueLabels[0] ? 0 : 1));
        
        const X_unbiased = MathUtils.transpose(X_transposed);
        const X = X_unbiased.map(row => [1, ...row]); // Add bias term

        let weights: Vector = new Array(X[0].length).fill(0);
        const costs: number[] = [];
        const accuracies: number[] = [];
        
        for (let i = 0; i < epochs; i++) {
            let cost = 0;
            const predictions: number[] = [];
            const errors: number[] = [];

            for (let j = 0; j < X.length; j++) {
                const z = X[j].reduce((acc, val, idx) => acc + val * weights[idx], 0);
                const h = MathUtils.sigmoid(z);
                predictions.push(h > 0.5 ? 1 : 0);
                
                // Cross-entropy loss
                cost += -y[j] * Math.log(h + 1e-9) - (1 - y[j]) * Math.log(1 - h + 1e-9);
                errors.push(h - y[j]);
            }
            
            costs.push(cost / X.length);
            accuracies.push(predictions.reduce((acc, p, j) => acc + (p === y[j] ? 1 : 0), 0) / X.length);

            const gradient = new Array(weights.length).fill(0);
            for (let j = 0; j < X.length; j++) {
                for (let k = 0; k < weights.length; k++) {
                    gradient[k] += errors[j] * X[j][k];
                }
            }

            for (let k = 0; k < weights.length; k++) {
                weights[k] -= (learningRate / X.length) * gradient[k];
            }
        }
        
        const finalPredictions = X.map(row => {
            const z = row.reduce((acc, val, idx) => acc + val * weights[idx], 0);
            return MathUtils.sigmoid(z) > 0.5 ? 1 : 0;
        });

        const cm: Matrix = [[0, 0], [0, 0]]; // [[TN, FP], [FN, TP]]
        y.forEach((trueVal, i) => {
            const predVal = finalPredictions[i];
            cm[1-trueVal][1-predVal]++;
        });
        const [TN, FP] = cm[0];
        const [FN, TP] = cm[1];
        
        const precision = TP / (TP + FP) || 0;
        const recall = TP / (TP + FN) || 0;
        const f1Score = 2 * (precision * recall) / (precision + recall) || 0;

        setActiveModel({
            weights, costs, accuracies, confusionMatrix: cm, precision, recall, f1Score,
            predict: (X_pred: Matrix) => {
                const X_with_bias = X_pred.map(row => [1, ...row]);
                return X_with_bias.map(row => {
                    const z = row.reduce((acc, val, idx) => acc + val * weights[idx], 0);
                    return MathUtils.sigmoid(z) > 0.5 ? 1 : 0;
                });
            }
        });

        toast({ title: "Training Complete", description: `Logistic Regression model trained.` });
    } catch(error) {
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
          <CardTitle>Train Logistic Regression</CardTitle>
          <CardDescription>Configure and train a binary classification model on the loaded data.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-2">
                <Label htmlFor="features">Feature Columns (comma-separated)</Label>
                <Input id="features" value={features} onChange={(e) => setFeatures(e.target.value)} disabled={isTraining} />
            </div>
            <div className="grid gap-2">
                <Label htmlFor="target">Target Column</Label>
                <Input id="target" value={target} onChange={(e) => setTarget(e.target.value)} disabled={isTraining} />
            </div>
            <div className="grid gap-2">
                <Label htmlFor="lr">Learning Rate</Label>
                <Input id="lr" type="number" value={learningRate} onChange={(e) => setLearningRate(parseFloat(e.target.value))} step="0.001" disabled={isTraining} />
            </div>
            <div className="grid gap-2">
                <Label htmlFor="epochs">Epochs</Label>
                <Input id="epochs" type="number" value={epochs} onChange={(e) => setEpochs(parseInt(e.target.value))} disabled={isTraining} />
            </div>
          </div>
          <Button onClick={handleTrain} disabled={isTraining || !features || !target}>
            {isTraining && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isTraining ? 'Training...' : 'Train Model'}
          </Button>
        </CardContent>
      </Card>

      {activeModel && (
        <div className="space-y-6 animate-in fade-in-50 duration-500">
            <Card>
                <CardHeader>
                    <CardTitle>Model Performance</CardTitle>
                    <CardDescription>Metrics calculated on the full training dataset.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-6 md:grid-cols-2">
                    <div>
                        <h4 className="font-semibold mb-2">Confusion Matrix</h4>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead></TableHead>
                                    <TableHead>Predicted 0</TableHead>
                                    <TableHead>Predicted 1</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                <TableRow>
                                    <TableHead className="font-semibold">Actual 0</TableHead>
                                    <TableCell>{activeModel.confusionMatrix[0][0]}</TableCell>
                                    <TableCell>{activeModel.confusionMatrix[0][1]}</TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableHead className="font-semibold">Actual 1</TableHead>
                                    <TableCell>{activeModel.confusionMatrix[1][0]}</TableCell>
                                    <TableCell>{activeModel.confusionMatrix[1][1]}</TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                    </div>
                    <div className="space-y-2">
                       <h4 className="font-semibold mb-2">Key Metrics</h4>
                        <ul className="space-y-1">
                            <li className="flex justify-between"><span>Accuracy:</span> <span>{activeModel.accuracies.slice(-1)[0].toFixed(4)}</span></li>
                            <li className="flex justify-between"><span>Precision:</span> <span>{activeModel.precision.toFixed(4)}</span></li>
                            <li className="flex justify-between"><span>Recall:</span> <span>{activeModel.recall.toFixed(4)}</span></li>
                            <li className="flex justify-between"><span>F1-Score:</span> <span>{activeModel.f1Score.toFixed(4)}</span></li>
                            <li className="flex justify-between"><span>Final Cost:</span> <span>{activeModel.costs.slice(-1)[0].toFixed(6)}</span></li>
                        </ul>
                    </div>
                </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Training Progress</CardTitle>
                <CardDescription>Cost and accuracy over training epochs.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[400px] w-full">
                  <ChartContainer config={chartConfig} className="w-full h-full">
                    <LineChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="epoch" tick={{ fill: 'hsl(var(--muted-foreground))' }} tickLine={{ stroke: 'hsl(var(--border))' }} />
                      <YAxis yAxisId="left" tickFormatter={(v) => v.toFixed(3)} tick={{ fill: 'hsl(var(--muted-foreground))' }} tickLine={{ stroke: 'hsl(var(--border))' }} />
                      <YAxis yAxisId="right" orientation="right" tickFormatter={(v) => v.toFixed(2)} tick={{ fill: 'hsl(var(--muted-foreground))' }} tickLine={{ stroke: 'hsl(var(--border))' }} />
                      <Tooltip content={<ChartTooltipContent />} />
                      <Legend />
                      <Line yAxisId="left" type="monotone" dataKey="cost" stroke="var(--color-cost)" strokeWidth={2} dot={false} />
                      <Line yAxisId="right" type="monotone" dataKey="accuracy" stroke="var(--color-accuracy)" strokeWidth={2} dot={false} />
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
