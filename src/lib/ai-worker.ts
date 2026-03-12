import { pipeline, env } from "@xenova/transformers";

// Tell Transformers.js to only download the model from the Hugging Face hub (browser mode)
env.allowLocalModels = false;

type PipelineInstance = (text: string, labels: string[] | string) => Promise<unknown>;
type ProgressCallback = (progress: unknown) => void;

class PipelineSingleton {
    static task: "zero-shot-classification" = "zero-shot-classification";
    // We use a tiny, quantized model specifically optimized for mobile/browsers
    static model = "Xenova/mobilebert-uncased-mnli";
    static instance: Promise<PipelineInstance> | null = null;

    static async getInstance(progress_callback: ProgressCallback) {
        if (this.instance === null) {
            this.instance = pipeline(this.task, this.model, { progress_callback }) as Promise<PipelineInstance>;
        }
        return this.instance;
    }
}

self.addEventListener("message", async (event: MessageEvent<{ text: string; labels: string[] }>) => {
    const { text, labels } = event.data;

    // Load the pipeline
    const classifier = await PipelineSingleton.getInstance((x) => {
        // We can send loading progress back to the UI
        self.postMessage(x);
    });

    // Run the zero-shot classification
    const output = await classifier(text, labels);

    self.postMessage({
        status: "complete",
        output: output,
    });
});
