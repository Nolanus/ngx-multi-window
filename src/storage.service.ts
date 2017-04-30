import {Injectable} from '@angular/core';

@Injectable()
export class StorageService {

    private window: Window;
    private localStorage: Storage;
    private sessionStorage: Storage;

    constructor() {
        this.window = window;
        this.localStorage = window.localStorage;
        this.sessionStorage = window.sessionStorage;
    }

    /*
     Write methods
     */

    public setLocalObject(key: string, obj: any): boolean {
        return this.setObject(this.localStorage, key, obj);
    }

    public setLocalItem(key: string, obj: string): void {
        this.setItem(this.localStorage, key, obj);
    }

    public setSessionObject(key: string, obj: any): boolean {
        return this.setObject(this.sessionStorage, key, obj);
    }

    public setSessionItem(key: string, obj: string): void {
        this.setItem(this.sessionStorage, key, obj);
    }

    private setObject(storage: Storage, key: string, obj: any): boolean {
        let jsonString: string;
        try {
            jsonString = JSON.stringify(obj);
        } catch (ex) {
            return false;
        }
        this.setItem(storage, key, jsonString);
        return true;
    }

    private setItem(storage: Storage, key: string, obj: string): void {
        storage.setItem(key, obj);
    }

    public setWindowName(value: string): void {
        this.window.name = value;
    }

    /*
     Read methods
     */

    public getLocalObject<T>(key: string): T | null {
        return this.getObject<T>(this.localStorage, key);
    }

    public getLocalObjects<T>(keys: string[]): (T | null)[] {
        return this.getObjects<T>(this.localStorage, keys);
    }

    public getLocalItem(key: string): string | null {
        return this.getItem(this.localStorage, key);
    }

    public getSessionObject<T>(key: string): T | null {
        return this.getObject<T>(this.sessionStorage, key);
    }

    public getSessionObjects<T>(keys: string[]): (T | null)[] {
        return this.getObjects<T>(this.sessionStorage, keys);
    }

    public getSessionItem(key: string): string | null {
        return this.getItem(this.sessionStorage, key);
    }

    public getObjects<T>(storage: Storage, keys: string[]): (T | null)[] {
        return keys.map(key => this.getObject<T>(storage, key));
    }

    private getObject<T>(storage: Storage, key: string): T | null {
        let jsonString = this.getItem(storage, key);
        if (jsonString === null) {
            return null;
        }
        try {
            return JSON.parse(jsonString) as T;
        } catch (ex) {
            return null;
        }
    }

    private getItem(storage: Storage, key: string): string | null {
        return storage.getItem(key) || null;
    }

    public getWindowName(): string {
        return this.window.name;
    }

    /*
     Remove methods
     */

    public removeLocalItem(key: string): void {
        this.removeItem(this.localStorage, key);
    }

    public removeSessionItem(key: string): void {
        this.removeItem(this.sessionStorage, key);
    }

    private removeItem(storage: Storage, key: string): void {
        storage.removeItem(key);
    }

    public clearLocalStorage(): void {
        this.clearStorage(this.localStorage);
    }

    public clearSessionStorage(): void {
        this.clearStorage(this.sessionStorage);
    }

    private clearStorage(storage: Storage): void {
        storage.clear();
    }

    /*
     Inspection methods
     */

    public getLocalItemKeys(): string[] {
        return this.getStorageItemKeys(this.localStorage);
    }

    public getSessionItemKeys(): string[] {
        return this.getStorageItemKeys(this.sessionStorage);
    }

    private getStorageItemKeys(storage: Storage): string[] {
        return Object.keys(storage);
    }
}
