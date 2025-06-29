# **App Name**: Monochrome ML Toolkit

## Core Features:

- Command-Line Interface: Terminal-based UI with clear command structure for data loading, profiling, model training, and AI assistance.
- Data Loading: Load data from CSV files. Uses the 'ora' library to display loading status.
- Data Profiling: Generate a summary of the loaded dataset. Displays data types, statistics, and unique values per column.
- K-Means Training: Train a K-Means clustering model on selected features. Uses an interactive prompt via 'inquirer' for configuration.
- AI Assistance: Connects to a local AI assistant (Ollama) to provide guidance.  The prompt guides the LLM to act as a ML Engineer, and incorporates information about what the user is doing, so that the LLM can provide more contextually relevant support. Note: must have Ollama installed locally. 
- Code Implementation Tool: Tool that helps generate an appropriate code implementation for an algorithm based on provided descriptions and TypeScript standards.

## Style Guidelines:

- Primary color: Light gray (#D3D3D3) for a neutral background.
- Background color: Off-white (#F0F0F0), slightly desaturated from the primary to offer good contrast while retaining a monochrome feel.
- Accent color: Dark gray (#4A4A4A) for interactive elements and important information.
- Font: 'Source Code Pro' monospace font (no pairing). Monospace font provides high legibility on the command line, which matches the content, which will consist mostly of computer code.
- Simple line-based icons in dark gray to represent data, models, and actions.
- Clean, organized layout with clear separation of sections for data input, model training, and AI output.
- Subtle animations using the 'ora' library to indicate loading and processing states.