import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: join(__dirname, '..', '.env') })

// ============================================
// AVAILABLE AI MODELS
// ============================================
const AVAILABLE_MODELS = [
    { id: 'openai/gpt-4o', name: 'GPT-4o', desc: '🧠 Suy luận mạnh nhất', speed: 'Nhanh', quality: 'Rất tốt' }
]

// Model riêng cho Tutor Chat
const TUTOR_CHAT_MODEL = 'openai/gpt-4o'

// ============================================
// CURRENT MODEL STATE
// ============================================
let currentModel = process.env.AI_MODEL || 'openai/gpt-4o'
console.log(`🤖 AI Model mặc định: ${currentModel}`)

function getCurrentModel() {
    return currentModel
}

function setCurrentModel(model) {
    currentModel = model
}

// ============================================
// AI CLIENT WRAPPER (OpenRouter API)
// ============================================
const ai = {
    models: {
        generateContent: async ({ model, contents, config }) => {
            const messages = [];
            if (config?.systemInstruction) {
                messages.push({ role: 'system', content: config.systemInstruction });
            }
            messages.push({ role: 'user', content: contents });

            const body = {
                model: model,
                messages: messages,
                temperature: config?.temperature || 0.7,
            };
            
            if (config?.responseMimeType === 'application/json') {
                body.response_format = { type: 'json_object' };
            }

            const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(body)
            });

            const data = await res.json();
            if (!res.ok) {
                console.error('❌ OpenRouter API Error:', JSON.stringify(data, null, 2));
                throw new Error(data.error?.message || 'OpenRouter Error');
            }
            return { text: data.choices[0].message.content };
        }
    },
    chats: {
        create: ({ model, config, history }) => {
            let messages = [];
            if (config?.systemInstruction) {
                messages.push({ role: 'system', content: config.systemInstruction });
            }
            if (history) {
                history.forEach(h => {
                    const role = h.role === 'model' ? 'assistant' : h.role;
                    messages.push({ role, content: h.parts[0].text });
                });
            }
            return {
                sendMessage: async ({ message, tools, toolHandlers, stream = false }) => {
                    const currentMessages = [...messages, { role: 'user', content: message }];
                    messages = currentMessages; // update history
                    
                    const body = {
                        model: model,
                        messages: currentMessages,
                        temperature: config?.temperature || 0.7,
                    };

                    if (tools) {
                        body.tools = tools;
                    }

                    if (stream) {
                        body.stream = true;
                        const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                            method: "POST",
                            headers: {
                                "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
                                "Content-Type": "application/json"
                            },
                            body: JSON.stringify(body)
                        });
                        if (!res.ok) {
                            const errData = await res.json().catch(() => ({}));
                            throw new Error(errData.error?.message || `HTTP error ${res.status}`);
                        }
                        return res.body; // Return readable stream
                    }

                    let res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                        method: "POST",
                        headers: {
                            "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify(body)
                    });

                    let data = await res.json();
                    if (!res.ok) {
                        console.error('❌ OpenRouter Chat Error:', JSON.stringify(data, null, 2));
                        throw new Error(data.error?.message || 'OpenRouter Error');
                    }

                    let responseMessage = data.choices[0].message;

                    // Loop to handle tool calls (ReAct loop)
                    while (responseMessage.tool_calls && responseMessage.tool_calls.length > 0) {
                        console.log(`🤖 Agent requested tool calls:`, responseMessage.tool_calls.map(tc => tc.function.name));
                        messages.push(responseMessage);

                        for (const toolCall of responseMessage.tool_calls) {
                            const handler = toolHandlers?.[toolCall.function.name];
                            let resultStr = '';
                            if (handler) {
                                try {
                                    const args = JSON.parse(toolCall.function.arguments);
                                    const result = await handler(args);
                                    resultStr = typeof result === 'string' ? result : JSON.stringify(result);
                                    console.log(`✅ Executed tool "${toolCall.function.name}" successfully.`);
                                } catch (err) {
                                    resultStr = `Error executing tool: ${err.message}`;
                                    console.error(`❌ Error executing tool "${toolCall.function.name}":`, err.message);
                                }
                            } else {
                                resultStr = `Tool ${toolCall.function.name} is not implemented.`;
                                console.warn(`⚠️ Tool "${toolCall.function.name}" requested but no handler provided.`);
                            }

                            messages.push({
                                role: 'tool',
                                tool_call_id: toolCall.id,
                                name: toolCall.function.name,
                                content: resultStr
                            });
                        }

                        // Get next model response
                        body.messages = messages;
                        res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                            method: "POST",
                            headers: {
                                "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
                                "Content-Type": "application/json"
                            },
                            body: JSON.stringify(body)
                        });

                        data = await res.json();
                        if (!res.ok) {
                            console.error('❌ OpenRouter Tool Responded Chat Error:', JSON.stringify(data, null, 2));
                            throw new Error(data.error?.message || 'OpenRouter Error');
                        }
                        responseMessage = data.choices[0].message;
                    }

                    messages.push(responseMessage);
                    return { text: responseMessage.content };
                }
            };
        }
    }
};

export { ai, AVAILABLE_MODELS, TUTOR_CHAT_MODEL, currentModel, getCurrentModel, setCurrentModel }
