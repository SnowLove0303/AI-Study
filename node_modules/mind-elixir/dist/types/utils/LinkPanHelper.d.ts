declare const create: (dom: HTMLElement) => {
    dom: HTMLElement;
    moved: boolean;
    pointerdown: boolean;
    lastX: number;
    lastY: number;
    handlePointerMove(e: PointerEvent): void;
    handlePointerDown(e: PointerEvent): void;
    handleClear(e: PointerEvent): void;
    cb: ((deltaX: number, deltaY: number) => void) | null;
    init(map: HTMLElement, cb: (deltaX: number, deltaY: number) => void): void;
    destroy: (() => void) | null;
    clear(): void;
};
declare const LinkPanHelper: {
    create: (dom: HTMLElement) => {
        dom: HTMLElement;
        moved: boolean;
        pointerdown: boolean;
        lastX: number;
        lastY: number;
        handlePointerMove(e: PointerEvent): void;
        handlePointerDown(e: PointerEvent): void;
        handleClear(e: PointerEvent): void;
        cb: ((deltaX: number, deltaY: number) => void) | null;
        init(map: HTMLElement, cb: (deltaX: number, deltaY: number) => void): void;
        destroy: (() => void) | null;
        clear(): void;
    };
};
export type LinkPanHelperInstance = ReturnType<typeof create>;
export default LinkPanHelper;
