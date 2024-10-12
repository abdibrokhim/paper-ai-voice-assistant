export interface UserInfo {
    id: string;
    name: string;
    firstName: string;
    lastName: string;
    email: string;
}

/* Annotation Types */

export interface Annotation {
    "@context": [
        "https://www.w3.org/ns/anno.jsonld",
        "https://comments.acrobat.com/ns/anno.jsonld",
    ]
    type: "Annotation";
    id: string;
    bodyValue?: string;
    motivation: "commenting" | "replying";
    target: Target;
    creator: Creator;
    created: string; // ISO date string
    modified: string; // ISO date string
    stylesheet?: Stylesheet; // For freetext annotations
}

export interface Target {
source: string; // Document ID or Annotation ID
selector?: Selector;
}

export interface Creator {
type: "Person";
name: string;
}

export interface Stylesheet {
type: "CssStylesheet";
value: string;
}

/* Selector Types */

export type Selector =
| HighlightSelector
| NoteSelector
| FreeTextSelector
| StrikeoutSelector
| UnderlineSelector
| ShapeSelector;

export interface BaseSelector {
node: {
    index: number;
};
opacity?: number;
boundingBox: number[];
strokeColor?: string;
strokeWidth?: number;
type: "AdobeAnnoSelector";
subtype: string;
}

export interface QuadPointsSelector extends BaseSelector {
quadPoints: number[];
}

export interface HighlightSelector extends QuadPointsSelector {
subtype: "highlight";
}

export interface StrikeoutSelector extends QuadPointsSelector {
subtype: "strikeout";
}

export interface UnderlineSelector extends QuadPointsSelector {
subtype: "underline";
}

export interface NoteSelector extends BaseSelector {
subtype: "note";
}

export interface FreeTextSelector extends BaseSelector {
styleClass: string;
subtype: "freetext";
}

export interface ShapeSelector extends BaseSelector {
inkList: number[][][];
subtype: "shape";
}

export interface FileData {
    filePath: string;
    pk: string;
    fileId: string; // This will be the document ID in Firestore
}