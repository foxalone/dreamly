import fs from "node:fs";
const env = Object.fromEntries(fs.readFileSync(new URL("../.env.local", import.meta.url),"utf8").split("\n").filter(l=>/^[A-Z_]+=/.test(l)).map(l=>{const i=l.indexOf("=");return [l.slice(0,i),l.slice(i+1).replace(/^["']|["']$/g,"")]}));
const key = env.ONEIRO_OPENAI_API_KEY || env.OPENAI_API_KEY;
const text = "Новая белая машина, я очень рада, во сне я на ней приехала на работу, а потом с работы, не много поцарапала ее но меня это не расстроило";
const lensPrompt = "Read the dream through a psychological lens: emotions, inner conflict, memory, and waking-life parallels. Do not diagnose.";
const system = "You provide concise dream analysis text only. No headings, no questions, no advice.";
const user = `Dream text:
"""${text}"""

Write a concise dream analysis in Russian.

Interpretive lens: psychological.
${lensPrompt}
The lens changes emphasis and vocabulary only. Keep the same format.

Rules:
- Do NOT include any titles or section headers.
- Do NOT include words like "Summary", "Key symbols", or "Possible emotions".
- Do NOT ask questions.
- Do NOT give advice or suggestions.
- Do NOT address the user directly.
- Avoid medical or diagnostic language.
- Write as a natural, flowing interpretation paragraph (2–4 short paragraphs max).

Keep it under ~1000 characters.`;
async function run(model, extra){
  const t0=Date.now();
  const r = await fetch("https://api.openai.com/v1/chat/completions",{method:"POST",headers:{"Content-Type":"application/json",Authorization:"Bearer "+key},body:JSON.stringify({model,messages:[{role:"system",content:system},{role:"user",content:user}],...extra})});
  const j = await r.json();
  if(!r.ok){console.log(model,"ERR",JSON.stringify(j).slice(0,300));return;}
  console.log("=== "+model+(extra.reasoning_effort?" ["+extra.reasoning_effort+"]":"")+" ("+((Date.now()-t0)/1000).toFixed(1)+"s, in "+j.usage.prompt_tokens+" / out "+j.usage.completion_tokens+(j.usage.completion_tokens_details?.reasoning_tokens!=null?" (reasoning "+j.usage.completion_tokens_details.reasoning_tokens+")":"")+")");
  console.log(j.choices[0].message.content+"\n");
}
await run("gpt-5-nano",{reasoning_effort:"minimal"});
await run("gpt-5-nano",{reasoning_effort:"low"});
