import { deepseek } from '@ai-sdk/deepseek';
import {
    convertToModelMessages,
    stepCountIs,
    streamText, tool, UIMessage,
} from 'ai';
import { z } from 'zod';

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  const result = streamText({
    model: deepseek('deepseek-chat'),
    messages: convertToModelMessages(messages),
    stopWhen: stepCountIs(5),
    tools: {
        weather: tool({
          description: 'Get the weather in a location (fahrenheit)',
          inputSchema: z.object({
            location: z.string().describe('The location to get the weather for'),
          }),
          
          execute: async ({ location }) => {
            const temperature = Math.round(Math.random() * (90 - 32) + 32);
            return {
              location,
              temperature,
            };
          },
        }),
        convertFahrenheitToCelsius: tool({
            description: 'Convert a temperature in fahrenheit to celsius',
            inputSchema: z.object({
              temperature: z
                .number()
                .describe('The temperature in fahrenheit to convert'),
            }),
            execute: async ({ temperature }) => {
              const celsius = Math.round((temperature - 32) * (5 / 9));
              return {
                celsius,
              };
            },
          }),
      },
    });

  return result.toUIMessageStreamResponse({
    headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Encoding': 'none',
    },
  });
}