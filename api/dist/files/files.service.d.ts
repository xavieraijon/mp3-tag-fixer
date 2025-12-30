export interface Mp3Tags {
    title?: string;
    artist?: string;
    album?: string;
    year?: number;
    genre?: string;
    trackNumber?: number;
    bpm?: number;
    label?: string;
    albumArtist?: string;
    composer?: string;
    comment?: string;
    duration?: number;
    image?: Buffer;
}
export interface ParsedFilename {
    artist: string;
    title: string;
}
export declare class FilesService {
    private readonly uploadDir;
    readTags(buffer: Buffer): Promise<Mp3Tags>;
    writeTags(buffer: Buffer, tags: Mp3Tags): Promise<Buffer>;
    parseFilename(filename: string): ParsedFilename;
    saveTemp(file: Express.Multer.File): Promise<string>;
    readFile(filepath: string): Promise<Buffer>;
    deleteTemp(filepath: string): Promise<void>;
    sanitizeFilename(artist: string, title: string): string;
}
