/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { GoogleGenAI, Modality } from "@google/genai";
import type { GenerateContentResponse, VideosOperation } from "@google/genai";

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  throw new Error("API_KEY environment variable is not set");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });


const DECADE_STYLES: Record<string, string> = {
    '1920s': "recreate the soft-focus, romanticized look of black-and-white or sepia-toned portraits from the era. Use lighting that creates dramatic shadows (like Rembrandt lighting), typical of studio photography of the time. The image should have a subtle grain and a timeless, classic feel.",
    '1930s': "emulate the high-glamour, sharp, and glossy look of Hollywood studio portraits. The lighting should be dramatic and controlled, creating a soft glow on the subject while maintaining deep, rich blacks. The final image should feel polished and aspirational, like a silver screen movie star's photograph.",
    '1950s': "emulate the classic, slightly desaturated look of early color photography from that time. The image should have a hint of film grain and a soft focus, reminiscent of Kodachrome or early Ektachrome film.",
    '1960s': "capture the shift from polished, sharp, high-contrast fashion photography to the vibrant, saturated, and sometimes dreamlike quality of the late 60s. A vintage lens flare or slight color bleeding effect would be appropriate.",
    '1970s': "the photo must have a warm, earthy color palette with a distinct yellow or orange cast. Use a soft focus, noticeable film grain, and a slightly faded look, as if it were a well-loved photo print from an old album.",
    '1980s': "go for a sharp, glossy look with vibrant, potentially neon, colors. The photo should have higher contrast and could feature studio lighting effects like soft glows or defined lens flare, typical of 80s portrait and pop photography.",
    '1990s': "recreate the look of 90s point-and-shoot 35mm film cameras. The image should have a straightforward, slightly muted color palette, visible film grain, and the direct, sometimes harsh, look of an on-camera flash.",
    '2000s': "mimic the aesthetic of early consumer digital cameras. The image should be sharp, but may have some subtle digital noise or artifacts, slightly oversaturated colors, and the harsh, direct lighting from a built-in flash.",
    '2010s': "emulate the look of a high-quality smartphone photo with a popular Instagram-like filter (e.g., Valencia or X-Pro II). The image should have high saturation, possibly with a slight vignette or tilt-shift effect, capturing the polished-yet-casual social media aesthetic of the time.",
};


// --- Helper Functions ---
function getFallbackPrompt(decade: string): string {
    const styleHint = DECADE_STYLES[decade] || "capture the distinct fashion, hairstyles, and overall atmosphere of that time period.";
    return `Create an authentic-looking photograph of the person in this image from the ${decade}. The clothing, hairstyle, and photo quality must match the era. Specific photo style to emulate: ${styleHint}. The output must only be the image.`;
}

function extractDecade(prompt: string): string | null {
    const match = prompt.match(/(\d{4}s)/);
    return match ? match[1] : null;
}

function processGeminiResponse(response: GenerateContentResponse): string {
    const imagePartFromResponse = response.candidates?.[0]?.content?.parts?.find(part => part.inlineData);

    if (imagePartFromResponse?.inlineData) {
        const { mimeType, data } = imagePartFromResponse.inlineData;
        return `data:${mimeType};base64,${data}`;
    }

    const textResponse = response.text;
    console.error("API did not return an image. Response:", textResponse);
    throw new Error(`The AI model responded with text instead of an image: "${textResponse || 'No text response received.'}"`);
}

async function callGeminiWithRetry(imagePart: object, textPart: object): Promise<GenerateContentResponse> {
    const maxRetries = 3;
    const initialDelay = 1000;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await ai.models.generateContent({
                model: 'gemini-2.5-flash-image',
                contents: { parts: [imagePart, textPart] },
            });
        } catch (error) {
            console.error(`Error calling Gemini API (Attempt ${attempt}/${maxRetries}):`, error);
            const errorMessage = error instanceof Error ? error.message : JSON.stringify(error);
            const isInternalError = errorMessage.includes('"code":500') || errorMessage.includes('INTERNAL');

            if (isInternalError && attempt < maxRetries) {
                const delay = initialDelay * Math.pow(2, attempt - 1);
                console.log(`Internal error detected. Retrying in ${delay}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));
                continue;
            }
            throw error;
        }
    }
    throw new Error("Gemini API call failed after all retries.");
}


export async function generateDecadeImage(imageDataUrl: string, prompt: string): Promise<string> {
  const match = imageDataUrl.match(/^data:(image\/\w+);base64,(.*)$/);
  if (!match) {
    throw new Error("Invalid image data URL format. Expected 'data:image/...;base64,...'");
  }
  const [, mimeType, base64Data] = match;

    const imagePart = {
        inlineData: { mimeType, data: base64Data },
    };

    try {
        console.log("Attempting generation with original prompt...");
        const textPart = { text: prompt };
        const response = await callGeminiWithRetry(imagePart, textPart);
        return processGeminiResponse(response);
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : JSON.stringify(error);
        const isNoImageError = errorMessage.includes("The AI model responded with text instead of an image");

        if (isNoImageError) {
            console.warn("Original prompt was likely blocked. Trying a fallback prompt.");
            const decade = extractDecade(prompt);
            if (!decade) {
                console.error("Could not extract decade from prompt, cannot use fallback.");
                throw error;
            }

            try {
                const fallbackPrompt = getFallbackPrompt(decade);
                console.log(`Attempting generation with fallback prompt for ${decade}...`);
                const fallbackTextPart = { text: fallbackPrompt };
                const fallbackResponse = await callGeminiWithRetry(imagePart, fallbackTextPart);
                return processGeminiResponse(fallbackResponse);
            } catch (fallbackError) {
                console.error("Fallback prompt also failed.", fallbackError);
                const finalErrorMessage = fallbackError instanceof Error ? fallbackError.message : String(fallbackError);
                throw new Error(`The AI model failed with both original and fallback prompts. Last error: ${finalErrorMessage}`);
            }
        } else {
            console.error("An unrecoverable error occurred during image generation.", error);
            throw new Error(`The AI model failed to generate an image. Details: ${errorMessage}`);
        }
    }
}

export async function editDecadeImage(imageDataUrl: string, prompt: string): Promise<string> {
    const match = imageDataUrl.match(/^data:(image\/\w+);base64,(.*)$/);
    if (!match) {
        throw new Error("Invalid image data URL format. Expected 'data:image/...;base64,...'");
    }
    const [, mimeType, base64Data] = match;

    const imagePart = {
        inlineData: { mimeType, data: base64Data },
    };
    const textPart = { text: prompt };

    try {
        console.log("Attempting image edit...");
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: {
                parts: [imagePart, textPart],
            },
            config: {
                responseModalities: [Modality.IMAGE],
            },
        });
        return processGeminiResponse(response);
    } catch (error) {
        console.error("An error occurred during image editing.", error);
        const errorMessage = error instanceof Error ? error.message : JSON.stringify(error);
        throw new Error(`The AI model failed to edit the image. Details: ${errorMessage}`);
    }
}


/**
 * Generates a short, thematic audio description for a given decade.
 * @param decade The decade string (e.g., "1970s").
 * @returns A promise that resolves to a base64-encoded audio data string.
 */
export async function generateAudioDescription(decade: string): Promise<string> {
    // 1. Generate a creative script
    const textGenResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Create a short, fun, immersive audio script (30-50 words) for a person looking at their photo from the ${decade}. It could be a snippet from a radio broadcast, a diary entry, or a comment from a friend. Make it sound authentic to the era. The output should be only the script text itself.`,
    });
    const script = textGenResponse.text;

    // 2. Generate audio from the script
    const ttsResponse = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: script }] }],
        config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
                voiceConfig: {
                    prebuiltVoiceConfig: { voiceName: 'Kore' },
                },
            },
        },
    });

    const audioData = ttsResponse.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!audioData) {
        throw new Error("TTS model did not return audio data.");
    }
    return audioData;
}


/**
 * Generates a short video based on a starting image and a decade.
 * @param imageDataUrl The data URL of the seed image.
 * @param decade The decade string (e.g., "1950s").
 * @param aspectRatio The desired aspect ratio for the video.
 * @returns A promise that resolves to an object URL for the generated video.
 */
export async function generateDecadeVideo(imageDataUrl: string, decade: string, aspectRatio: '9:16' | '16:9'): Promise<string> {
    const match = imageDataUrl.match(/^data:(image\/\w+);base64,(.*)$/);
    if (!match) {
        throw new Error("Invalid image data URL format for video generation.");
    }
    const [, mimeType, imageBytes] = match;

    const videoAi = new GoogleGenAI({ apiKey: process.env.API_KEY });

    try {
        let operation: VideosOperation = await videoAi.models.generateVideos({
            model: 'veo-3.1-fast-generate-preview',
            prompt: `A short, vintage-style video clip of this person from the ${decade}. The person should be subtly animated, perhaps smiling, looking around, or with a slight breeze in their hair. The video should have the look and feel of an authentic home movie from that era.`,
            image: { imageBytes, mimeType },
            config: {
                numberOfVideos: 1,
                resolution: '720p',
                aspectRatio: aspectRatio
            }
        });

        // Poll for completion
        while (!operation.done) {
            await new Promise(resolve => setTimeout(resolve, 10000));
            operation = await videoAi.operations.getVideosOperation({ operation: operation });
        }

        const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
        if (!downloadLink) {
            throw new Error("Video generation completed, but no download link was found.");
        }
        
        // Fetch the video data using the API key
        const response = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
        if (!response.ok) {
            throw new Error(`Failed to fetch video data: ${response.statusText}`);
        }
        const videoBlob = await response.blob();
        return URL.createObjectURL(videoBlob);

    } catch (error) {
        console.error("Video generation process failed:", error);
        // Re-throw a more user-friendly error
        throw new Error(`Video generation failed. Details: ${error instanceof Error ? error.message : String(error)}`);
    }
}