// Step 4: you already wrote a framework.
//
// createAgent is the while loop from step 3: call the model, run the tools it asks for,
// push the results, repeat until it stops asking. Plus a checkpointer, which keeps the
// messages list for you (step 2's job), per conversation thread.
//
// Try:  "What do I have tomorrow, and will it rain?"
import { HumanMessage, createAgent, tool } from "langchain";
import { MemorySaver } from "@langchain/langgraph";
import { z } from "zod";
import { ask } from "../../lib/cli.ts";
import { chatModel } from "../../lib/model.ts";
import { showTurn } from "../../lib/print.ts";
import { getTimetable, getWeather, todayText } from "../../lib/tools.ts";

// TODO: write your own tool. A name, a description, a schema, and a function.
// Ideas: canteen menu, bus times from Moratuwa, a GPA calculator, days until exams.
//
// const myTool = tool(
//   async ({ something }) => {
//     return `...a string the model will read...`;
//   },
//   {
//     name: "myTool",
//     description: "What it does and WHEN the model should use it.",
//     schema: z.object({
//       something: z.string().describe("What this argument means"),
//     }),
//   },
// );

const examCountdownTool = tool(
  async ({ examDate }) => {
    // 1. Get current date and exam date
    const today = new Date();
    const exam = new Date(examDate);

    // 2. Calculate the difference in milliseconds, then convert to days
    const diffTime = exam.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    // 3. Return a string the model will read
    if (diffDays < 0) {
      return `The exam on ${examDate} has already passed by ${Math.abs(diffDays)} days.`;
    }
    return `There are ${diffDays} days remaining until the exam on ${examDate}.`;
  },
  {
    name: "examCountdownTool",
    description:
      "Calculates the number of days remaining until a specific exam date. Use this when the user asks how much time is left before an exam.",
    schema: z.object({
      examDate: z
        .string()
        .describe("The date of the exam in YYYY-MM-DD format"),
    }),
  },
);

const agent = createAgent({
  model: chatModel(),
  tools: [
    getWeather,
    getTimetable /* TODO: add your tool here */,
    examCountdownTool,
  ],
  systemPrompt:
    "You are Campus Buddy, a friendly assistant for University of Moratuwa students. " +
    "The campus is in Moratuwa, Sri Lanka. " +
    `Today is ${todayText()}. ` +
    "Use your tools when you need live or personal information. Keep answers short and casual.",
  checkpointer: new MemorySaver(), // remembers each thread's messages between turns
});

// One conversation thread. A different thread_id would be a fresh conversation.
const config = { configurable: { thread_id: "nimal" } };

console.log(`Campus Buddy, step 4: createAgent. Type "exit" to quit.\n`);

while (true) {
  const input = await ask("You: ");
  // We only send the NEW message. The checkpointer adds the history.
  const result = await agent.invoke(
    { messages: [new HumanMessage(input)] },
    config,
  );
  showTurn(result.messages);
}
