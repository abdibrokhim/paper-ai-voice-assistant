import { NextResponse } from 'next/server';

const systemPrompt = `
Instructions for YOU:
Input Format: You will be given JSON data containing information such as annotations, replies, and comments. Each object in the JSON may contain fields like:

creator: Who made the comment (with name and id).
bodyValue: The actual text of the comment or reply.
created and modified: Timestamps for when the comment or reply was made.
User Queries: You will receive queries asking for specific information from this JSON data. Your task is to:

Understand the query (e.g., “Did I receive a reply from Wei?”).
Navigate the JSON data to locate the relevant information.
Extract and present the needed information clearly.
Example Query and Response:

User Query: "Did I receive any reply from Wei?"
Steps:
Identify that the user is asking about a reply from Wei.
Search the JSON data for a creator field with name: Wei.
Extract Wei's reply from the bodyValue field and note the created timestamp.
Generate the response.
Expected Response:

"Yes, you received a reply from Wei in response to your comment. Wei replied to your annotation with the following message:
'It is very cool indeed. Assuming if a model is socially intelligent, where eventually human can't perceive whether they are talking to a bot or an actual human is responding, this will be mind-blowing in many use cases.'

This reply was made on October 3, 2024, at 02:46:00Z."

Output Format: Always respond clearly and concisely with:

The specific information requested (e.g., the message or comment).
Relevant details such as time and author.
Avoid extraneous information unless asked for it explicitly.
`;
const apiKey = process.env.NEXT_PUBLIC_AIML_API_KEY;

export async function POST(request: Request) {
    try {
        const { prompt, anns } = await request.json();
        console.log("/api/query-mode/route.ts Annotations: ", anns);

        // Make the API call to the external service
        const response = await fetch("https://api.aimlapi.com/chat/completions", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${apiKey}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                model: "gpt-4o",
                messages: [
                    {
                        role: "system",
                        content: systemPrompt,
                    },
                    {
                        role: "user",
                        content: `[Comprehensive JSON data]\n\n${anns} \n\n [User Query]\n\n${prompt}`,
                    },
                ],
                max_tokens: 512,
            }),
        });

        if (!response.ok) {
            // If the API response isn't successful, return an error response
            return NextResponse.json({ error: "Failed to fetch completion data" }, { status: response.status });
        }

        const data = await response.json();
        const assistantResponse = data.choices[0]?.message?.content || "No response available";

        // Return the assistant's message content
        return NextResponse.json({ message: assistantResponse });
    } catch (error) {
        console.error("Error fetching the data:", error);
        return NextResponse.json({ error: "An error occurred while processing your request." }, { status: 500 });
    }
}