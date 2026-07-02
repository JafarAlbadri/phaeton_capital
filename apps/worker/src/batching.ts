export interface Batchable {
    content: string;
}

/**
 * Split posts into batches sized by approximate token count (1 token ≈ 4
 * chars) so a single AI request never blows the provider's TPM limit, with a
 * post-count ceiling so prompts stay conceptually manageable.
 */
export function buildTokenBatches<T extends Batchable>(
    posts: T[],
    maxTokensPerBatch = 4000,
    maxPostsPerBatch = 25,
): T[][] {
    const batches: T[][] = [];
    let current: T[] = [];
    let currentTokens = 0;

    for (const post of posts) {
        const estTokens = Math.ceil(post.content.length / 4);

        if (current.length > 0 && (currentTokens + estTokens > maxTokensPerBatch || current.length >= maxPostsPerBatch)) {
            batches.push(current);
            current = [];
            currentTokens = 0;
        }

        current.push(post);
        currentTokens += estTokens;
    }

    if (current.length > 0) {
        batches.push(current);
    }

    return batches;
}
