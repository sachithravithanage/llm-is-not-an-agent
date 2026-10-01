// Step 3: an agent is an LLM, plus state, plus tools, running in a loop.
//
// The model can't check the weather. But it can *ask you to*, with a tool call.
// You run the tool, hand back the result, and ask the model again.
// Keep going until it stops asking. That loop is the agent.
//
// Try:  "Should I walk to campus or take the bus?"
import {
  HumanMessage,
  SystemMessage,
  ToolMessage,
  type BaseMessage,
  type StructuredTool,
} from "langchain";
import { ask, say } from "../../lib/cli.ts";
import { chatModel } from "../../lib/model.ts";
import { getWeather } from "../../lib/tools.ts";

const tools = [getWeather];
const toolsByName: Record<string, StructuredTool> = Object.fromEntries(
  tools.map((t) => [t.name, t]),
);

// bindTools tells the model which tools exist (name, description, schema).
const model = chatModel().bindTools(tools);

const messages: BaseMessage[] = [
  new SystemMessage(
    "You are Campus Buddy, a friendly assistant for University of Moratuwa students. " +
      "The campus is in Moratuwa, Sri Lanka. Use your tools when you need live information. " +
      "Keep answers short and casual.",
  ),
];

console.log(`Campus Buddy, step 3: an agent. Type "exit" to quit.\n`);

// The chat loop. YOU drive this one: one lap per thing you type.
while (true) {
  const input = await ask("You: ");
  messages.push(new HumanMessage(input));

  let reply = await model.invoke(messages);
  messages.push(reply); // push the model's reply as-is (Gemini needs it back unchanged)

  // The agent loop. The MODEL drives this one: it keeps going while it asks for tools.
  //
  // TODO (a): replace `false` so the loop keeps going while the model is asking for tools.
  //           Hint: reply.tool_calls is a list. When is it "asking"?
  while (reply.tool_calls && reply.tool_calls.length > 0) {
    for (const call of reply.tool_calls ?? []) {
      console.log(`  🔧 ${call.name}(${JSON.stringify(call.args)})`);

      // TODO (b1): run the tool the model asked for.
      //   1. find it:        toolsByName[call.name]
      const tool = toolsByName[call.name];

      if (!tool) {
        throw new Error(`Tool ${call.name} not found.`);
      }
      //   2. run it:         await ....invoke(call.args)
      const result = await tool.invoke(call.args);
      //   3. hand it back:   messages.push(new ToolMessage({ content: String(result), tool_call_id: call.id! }))
      messages.push(
        new ToolMessage({ content: String(result), tool_call_id: call.id! }),
      );
    }

    // TODO (b2): ask the model again with the updated messages,
    //            store the answer in `reply`, and push it onto `messages`.
    reply = await model.invoke(messages);
    messages.push(reply);
  }

  say(reply.text);
}
