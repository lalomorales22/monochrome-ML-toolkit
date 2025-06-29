"use client";

import { useState } from 'react';
import type { DataFrame, KMeansModel, LogisticRegressionModel, NeuralNetworkModel } from '@/lib/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Bot, Braces, Cpu, Database, Archive, BarChart2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import DataTab from '@/components/data-tab';
import TrainTab from '@/components/train-tab';
import AiTutorTab from '@/components/ai-tutor-tab';
import DataGeneratorTab from '@/components/code-tool-tab';
import FileGalleryTab from '@/components/file-gallery-tab';
import LogisticRegressionTab from './logistic-regression-tab';
import NeuralNetworkTab from './neural-network-tab';
import VisualizationTab from './visualization-tab';


export default function SynapseTerminal() {
  const [activeDataFrame, setActiveDataFrame] = useState<DataFrame | null>(null);
  const [activeModel, setActiveModel] = useState<KMeansModel | null>(null);
  const [activeLogisticRegressionModel, setActiveLogisticRegressionModel] = useState<LogisticRegressionModel | null>(null);
  const [activeNeuralNetworkModel, setActiveNeuralNetworkModel] = useState<NeuralNetworkModel | null>(null);
  const [modelingTask, setModelingTask] = useState('clustering');

  return (
    <Card className="w-full shadow-2xl bg-card/80 backdrop-blur-sm border-border/20">
      <CardContent className="p-2 md:p-4">
        <Tabs defaultValue="data" className="w-full">
          <TabsList className="grid w-full h-auto grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
            <TabsTrigger value="data" className="py-2"><Database className="mr-2" />Data</TabsTrigger>
            <TabsTrigger value="visualize" className="py-2"><BarChart2 className="mr-2" />Visualize</TabsTrigger>
            <TabsTrigger value="gallery" className="py-2"><Archive className="mr-2" />File Gallery</TabsTrigger>
            <TabsTrigger value="train" disabled={!activeDataFrame} className="py-2"><Cpu className="mr-2" />Modeling</TabsTrigger>
            <TabsTrigger value="tutor" className="py-2"><Bot className="mr-2" />AI Tutor</TabsTrigger>
            <TabsTrigger value="data-generator" className="py-2"><Braces className="mr-2" />Data Generator</TabsTrigger>
          </TabsList>

          <TabsContent value="data" className="mt-4">
            <DataTab activeDataFrame={activeDataFrame} setActiveDataFrame={setActiveDataFrame} />
          </TabsContent>

          <TabsContent value="visualize" className="mt-4">
            <VisualizationTab />
          </TabsContent>

          <TabsContent value="gallery" className="mt-4">
            <FileGalleryTab setActiveDataFrame={setActiveDataFrame} />
          </TabsContent>
          
          <TabsContent value="train" className="mt-4">
            <div className="flex flex-col gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Select Model</CardTitle>
                        <CardDescription>Choose a modeling task to perform on the loaded data.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Select value={modelingTask} onValueChange={setModelingTask}>
                            <SelectTrigger className="w-full md:w-[280px]">
                                <SelectValue placeholder="Select a model" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="clustering">K-Means Clustering</SelectItem>
                                <SelectItem value="classification">Logistic Regression</SelectItem>
                                <SelectItem value="neural-network">Neural Network</SelectItem>
                            </SelectContent>
                        </Select>
                    </CardContent>
                </Card>

                {modelingTask === 'clustering' && (
                    <TrainTab activeDataFrame={activeDataFrame!} activeModel={activeModel} setActiveModel={setActiveModel} />
                )}
                {modelingTask === 'classification' && (
                    <LogisticRegressionTab activeDataFrame={activeDataFrame!} activeModel={activeLogisticRegressionModel} setActiveModel={setActiveLogisticRegressionModel} />
                )}
                {modelingTask === 'neural-network' && (
                    <NeuralNetworkTab activeDataFrame={activeDataFrame!} activeModel={activeNeuralNetworkModel} setActiveModel={setActiveNeuralNetworkModel} />
                )}
            </div>
          </TabsContent>

          <TabsContent value="tutor" className="mt-4">
            <AiTutorTab />
          </TabsContent>
          
          <TabsContent value="data-generator" className="mt-4">
            <DataGeneratorTab />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
