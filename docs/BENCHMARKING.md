# PocketAI Benchmarking

## Metrics Collected
- Task type
- Model ID
- Document ID when applicable
- Chunk strategy
- Top K
- Prompt text
- Prompt token estimate
- Output token estimate
- Retrieval time
- Generation time
- Total time
- Tokens per second
- Selected chunk IDs
- Notes

## Chat Benchmark Procedure
Use “Run Test Prompt” with:

“Explain quantization in large language models in simple terms.”

Run the same prompt across both models and compare latency, output length, and tokens per second.

## Document Q&A Benchmark Procedure
Import a TXT document, open Benchmarks, and run the document benchmark. The app tests the same question over 256, 512, and 1024 token chunk strategies.

## Chunk Size Comparison
Compare retrieval time, selected chunks, prompt length, generation time, and answer quality notes for each chunk size.

## Model Comparison
Use the same settings and prompts for both models. Record model load time and response speed separately where possible.

## Export Format
The first implementation exports benchmark runs as JSON. CSV export is a planned extension.

## Thesis Usage
Results can support tables comparing quantized model performance, retrieval latency, generation speed, and the tradeoff between chunk size and answer quality.
