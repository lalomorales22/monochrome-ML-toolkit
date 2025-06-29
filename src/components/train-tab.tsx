"use client";

import React, { useState, useMemo, useEffect } from 'react';
import type { DataFrame, KMeansModel, Matrix, Vector, ChartConfig } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Legend, Tooltip } from "recharts";

interface TrainTabProps {
  activeDataFrame: DataFrame;
  activeModel: KMeansModel | null;
  setActiveModel: React.Dispatch<React.SetStateAction<KMeansModel | null>>;
}

class KMeansUtils {
    static euclideanDistance(p1: Vector, p2: Vector): number {
        return Math.sqrt(p1.reduce((sum, val, i) => sum + (val - p2[i]) ** 2, 0));
    }
    static mean(arr: number[]): number {
        if (arr.length === 0) return 0;
        return arr.reduce((a, b) => a + b, 0) / arr.length;
    }
    static transpose(matrix: Matrix): Matrix {
        if (matrix.length === 0) return [];
        return matrix[0].map((_, colIndex) => matrix.map(row => row[colIndex]));
    }
}

export default function TrainTab({ activeDataFrame, activeModel, setActiveModel }: TrainTabProps) {
  const [isTraining, setIsTraining] = useState(false);
  const [features, setFeatures] = useState('');
  const [k, setK] = useState(3);
  const { toast } = useToast();
  
  const [numericFeatures, setNumericFeatures] = useState<string[]>([]);
  const [xAxisFeature, setXAxisFeature] = useState<string>('');
  const [yAxisFeature, setYAxisFeature] = useState<string>('');

  useEffect(() => {
    if (activeDataFrame) {
      const numFeatures = Object.keys(activeDataFrame).filter(key =>
        activeDataFrame[key] && activeDataFrame[key].every(val => typeof val === 'number')
      );
      setFeatures(numFeatures.join(','));
    }
  }, [activeDataFrame]);

  useEffect(() => {
    const numFeatures = Object.keys(activeDataFrame).filter(key =>
      activeDataFrame[key].every(val => typeof val === 'number')
    );
    setNumericFeatures(numFeatures);

    if (numFeatures.length > 0) {
      const trainingFeatures = features.split(',').map(f => f.trim()).filter(f => numFeatures.includes(f));
      setXAxisFeature(trainingFeatures[0] || numFeatures[0]);
      if (numFeatures.length > 1) {
        setYAxisFeature(trainingFeatures[1] || numFeatures[1]);
      } else {
        setYAxisFeature(numFeatures[0]);
      }
    }
  }, [activeDataFrame, features]);

  const chartData = useMemo(() => {
    if (!activeModel || !xAxisFeature || !yAxisFeature || !activeDataFrame[xAxisFeature] || !activeDataFrame[yAxisFeature]) {
        return [];
    }
    return (activeDataFrame[xAxisFeature] as number[]).map((_, i) => ({
        x: activeDataFrame[xAxisFeature][i] as number,
        y: activeDataFrame[yAxisFeature][i] as number,
        cluster: activeModel.predictions[i],
    }));
  }, [activeModel, xAxisFeature, yAxisFeature, activeDataFrame]);

  const groupedChartData = useMemo(() => {
    if (chartData.length === 0) return {};
    return chartData.reduce((acc, point) => {
        const clusterKey = `cluster${point.cluster}`;
        if (!acc[clusterKey]) {
            acc[clusterKey] = [];
        }
        acc[clusterKey].push(point);
        return acc;
    }, {} as Record<string, typeof chartData>);
  }, [chartData]);
  
  const chartConfig = useMemo(() => {
    if (!activeModel) return {};
    const config: ChartConfig = {};
    for (let i = 0; i < activeModel.k; i++) {
        config[`cluster${i}`] = {
            label: `Cluster ${i + 1}`,
            color: `hsl(var(--chart-${(i % 5) + 1}))`
        };
    }
    return config;
  }, [activeModel?.k]);

  const handleTrain = async () => {
    setIsTraining(true);
    
    try {
        const featureCols = features.split(',').map(f => f.trim()).filter(f => f);
        if (featureCols.length === 0) {
            toast({ variant: "destructive", title: "Training Error", description: "Please enter at least one feature column." });
            setIsTraining(false);
            return;
        }

        const X_transposed: Matrix = featureCols.map(f => {
            if (!activeDataFrame[f]) throw new Error(`Feature '${f}' not found in data.`);
            if (activeDataFrame[f].some(v => typeof v !== 'number')) throw new Error(`Feature '${f}' contains non-numeric data.`);
            return activeDataFrame[f] as number[];
        });
        const X = KMeansUtils.transpose(X_transposed);

        const maxIterations = 100;
        let centroids: Matrix = [X[Math.floor(Math.random() * X.length)]];
        for (let i = 1; i < k; i++) {
            const distSq = X.map(point => Math.min(...centroids.map(c => KMeansUtils.euclideanDistance(point, c))) ** 2);
            const sumDistSq = distSq.reduce((a, b) => a + b, 0);
            const probabilities = distSq.map(d => d / sumDistSq);
            let sum = 0;
            const cumulativeProbabilities = probabilities.map(p => (sum += p));
            const rand = Math.random();
            const nextCentroidIndex = cumulativeProbabilities.findIndex(p => p >= rand);
            centroids.push(X[nextCentroidIndex]);
        }
        
        for (let iter = 0; iter < maxIterations; iter++) {
            const clusters: Vector[][] = Array.from({ length: k }, () => []);
            X.forEach(point => {
                const distances = centroids.map(c => KMeansUtils.euclideanDistance(point, c));
                const closestCentroidIndex = distances.indexOf(Math.min(...distances));
                clusters[closestCentroidIndex].push(point);
            });

            const newCentroids = clusters.map((cluster, index) => {
                if (cluster.length === 0) return centroids[index];
                return cluster[0].map((_, i) => KMeansUtils.mean(cluster.map(p => p[i])));
            });

            const converged = centroids.every((c, i) => c.every((val, j) => Math.abs(val - newCentroids[i][j]) < 1e-4));
            centroids = newCentroids;
            if (converged) break;
        }
        
        const predictions = X.map(point => {
            const distances = centroids.map(c => KMeansUtils.euclideanDistance(point, c));
            return distances.indexOf(Math.min(...distances));
        });

        let inertia = 0;
        X.forEach((point, i) => {
            const centroid = centroids[predictions[i]];
            if (centroid) {
                inertia += KMeansUtils.euclideanDistance(point, centroid) ** 2;
            }
        });

        setActiveModel({
            k, maxIterations, centroids, inertia, predictions,
            predict: (X_pred: Matrix) => X_pred.map(point => {
                const distances = centroids.map(c => KMeansUtils.euclideanDistance(point, c));
                return distances.indexOf(Math.min(...distances));
            })
        });

        toast({ title: "Training Complete", description: `K-Means model trained with ${k} clusters.` });
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
          <CardTitle>Train K-Means Model</CardTitle>
          <CardDescription>Configure and train a K-Means clustering model on the loaded data.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="features">Feature Columns (comma-separated)</Label>
            <Input 
              id="features" 
              value={features} 
              onChange={(e) => setFeatures(e.target.value)} 
              placeholder="e.g., feature1,feature2" 
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="k">Number of Clusters (K)</Label>
            <Input 
              id="k" 
              type="number" 
              value={k} 
              onChange={(e) => setK(parseInt(e.target.value, 10) || 1)} 
              min="1"
            />
          </div>
          <Button onClick={handleTrain} disabled={isTraining}>
            {isTraining && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isTraining ? 'Training...' : 'Train Model'}
          </Button>
        </CardContent>
      </Card>

      {activeModel && (
        <div className="space-y-6 animate-in fade-in-50 duration-500">
            <Card>
                <CardHeader>
                    <CardTitle>Trained Model: K-Means</CardTitle>
                    <CardDescription>The calculated centroids for the {activeModel.k} clusters.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Cluster</TableHead>
                                {features.split(',').map(f => f.trim()).filter(f => f).map((feature, i) => (
                                    <TableHead key={i}>{feature}</TableHead>
                                ))}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {activeModel.centroids.map((centroid, i) => (
                                <TableRow key={i}>
                                    <TableCell className="font-medium">{i + 1}</TableCell>
                                    {centroid.map((val, j) => <TableCell key={j}>{val.toFixed(4)}</TableCell>)}
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                    <div className="mt-4 border-t pt-4">
                        <h4 className="font-semibold text-card-foreground">Model Performance</h4>
                        <p className="text-sm text-muted-foreground">Inertia (Within-Cluster Sum of Squares): <span className="font-mono font-medium text-foreground">{activeModel.inertia.toFixed(2)}</span></p>
                        <p className="text-xs text-muted-foreground/80">A lower inertia value is better. Try different values of K to find the optimal number of clusters.</p>
                    </div>
                </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Cluster Visualization</CardTitle>
                <CardDescription>Scatter plot of the clusters. Select two features to visualize.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-4 mb-4 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <Label>X-Axis Feature</Label>
                    <Select value={xAxisFeature} onValueChange={setXAxisFeature}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {numericFeatures.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>Y-Axis Feature</Label>
                    <Select value={yAxisFeature} onValueChange={setYAxisFeature}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {numericFeatures.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="h-[400px] w-full">
                  <ChartContainer config={chartConfig} className="w-full h-full">
                    <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                      <CartesianGrid />
                      <XAxis type="number" dataKey="x" name={xAxisFeature} unit="" tick={{ fill: 'hsl(var(--muted-foreground))' }} tickLine={{ stroke: 'hsl(var(--border))' }} />
                      <YAxis type="number" dataKey="y" name={yAxisFeature} unit="" tick={{ fill: 'hsl(var(--muted-foreground))' }} tickLine={{ stroke: 'hsl(var(--border))' }} />
                      <Tooltip cursor={{ strokeDasharray: '3 3' }} content={<ChartTooltipContent hideLabel />} />
                      <Legend />
                      {Object.entries(groupedChartData).map(([clusterKey, data]) => (
                        <Scatter
                          key={clusterKey}
                          data={data}
                          fill={`var(--color-${clusterKey})`}
                          name={chartConfig[clusterKey]?.label}
                        />
                      ))}
                    </ScatterChart>
                  </ChartContainer>
                </div>
              </CardContent>
            </Card>
        </div>
      )}
    </div>
  );
}
