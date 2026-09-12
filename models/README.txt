The 7B GGUF is intentionally not bundled in this ZIP because it is several GB.
At runtime node-llama-cpp resolves:
hf:Qwen/Qwen2.5-7B-Instruct-GGUF:Q4_K_M
and downloads/caches the model in this directory.
