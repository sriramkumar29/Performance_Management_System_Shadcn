import { vi } from "vitest";

type ApiFetchMock = ReturnType<typeof vi.fn> | any;

export function createApiRouter(apiFetchMock: ApiFetchMock) {
    const routes: Array<{ matcher: (url: string, options?: any) => boolean; response: any }> = [];

    return {
        // matcher can be a string (substring), RegExp, or function(url, options)
        route(
            matcher: string | RegExp | ((url: string, options?: any) => boolean),
            response: any
        ) {
            const m =
                typeof matcher === "function"
                    ? matcher
                    : matcher instanceof RegExp
                        ? (url: string) => matcher.test(url)
                        : (url: string) => url.includes(matcher as string);
            routes.push({ matcher: m, response });
        },

        install() {
            apiFetchMock.mockImplementation((url: string, options?: any) => {
                for (const r of routes) {
                    try {
                        if (r.matcher(url, options)) return Promise.resolve(r.response);
                    } catch (e) {
                        // ignore matcher errors and continue
                    }
                }
                return Promise.resolve({ ok: true, data: [] });
            });
        },
    };
}
