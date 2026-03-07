import { pipeline, env } from '@xenova/transformers';

// Tell Transformers.js to only download the model from the Hugging Face hub (browser mode)
env.allowLocalModels = false;

class PipelineSingleton {
    static task: any = 'zero-shot-classification';
    // We use a tiny, quantized model specifically optimized for mobile/browsers
    static model = 'Xenova/mobilebert-uncased-mnli';
    static instance: any = null;

    static async getInstance(progress_callback: any) {
        if (this.instance === null) {
            this.instance = pipeline(this.task, this.model, { progress_callback });
        }
        return this.instance;
    }
}

self.addEventListener('message', async (event: any) => {
    const { text, labels } = event.data;

    // Load the pipeline
    let classifier = await PipelineSingleton.getInstance((x: any) => {
        // We can send loading progress back to the UI
        self.postMessage(x);
    });

    // Run the zero-shot classification
    let output = await classifier(text, labels);

    self.postMessage({
        status: 'complete',
        output: output,
    });
});
