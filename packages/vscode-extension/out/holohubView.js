"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HoloSmartAssetItem = exports.HoloHubTreeDataProvider = void 0;
const vscode = require("vscode");
const sdk_1 = require("@holoscript/sdk");
class HoloHubTreeDataProvider {
    constructor() {
        this._onDidChangeTreeData = new vscode.EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
        this.client = new sdk_1.HoloHubClient();
    }
    refresh() {
        this._onDidChangeTreeData.fire();
    }
    getTreeItem(element) {
        return element;
    }
    async getChildren(element) {
        if (element) {
            return [];
        }
        try {
            // Fetch assets from Mock HoloHub
            const assets = await this.client.searchAssets('');
            return assets.map((asset) => new HoloSmartAssetItem(asset));
        }
        catch (error) {
            vscode.window.showErrorMessage(`Failed to fetch HoloHub assets: ${error}`);
            return [];
        }
    }
}
exports.HoloHubTreeDataProvider = HoloHubTreeDataProvider;
class HoloSmartAssetItem extends vscode.TreeItem {
    constructor(asset) {
        super(asset.metadata.name, vscode.TreeItemCollapsibleState.None);
        this.asset = asset;
        this.tooltip = asset.metadata.description;
        this.description = `v${asset.metadata.version}`;
        // Icon (built-in package icon)
        this.iconPath = new vscode.ThemeIcon('package');
        this.contextValue = 'smartAsset';
    }
}
exports.HoloSmartAssetItem = HoloSmartAssetItem;
//# sourceMappingURL=holohubView.js.map