export type Matrix = number[][];
export type Vector = number[];
export type CategoricalValue = string | number;
export type DataFrame = Record<string, (number | CategoricalValue)[]>;

export interface Model {
    predict(X: Matrix): Vector | number[];
}

export interface KMeansModel extends Model {
    k: number;
    maxIterations: number;
    centroids: Matrix;
    inertia: number;
    predictions: Vector;
}

export interface LogisticRegressionModel extends Model {
    weights: Vector;
    costs: number[];
    accuracies: number[];
    confusionMatrix: Matrix;
    precision: number;
    recall: number;
    f1Score: number;
}

export interface NeuralNetworkModel extends Model {
    architecture: number[];
    weights: Matrix[];
    biases: Matrix[];
    costs: number[];
    // For classification
    accuracies?: number[];
    // For regression
    rSquared?: number;
    problemType: 'classification' | 'regression';
}
