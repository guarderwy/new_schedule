export {}

declare global {
  interface Window {
    storage: {
      read: (fileName: string) => Promise<any>
      write: (fileName: string, data: any) => Promise<boolean>
      list: () => Promise<string[]>
      export: (targetPath: string) => Promise<boolean>
      import: (sourcePath: string) => Promise<boolean>
      backup: () => Promise<boolean>
      chooseExportFile: () => Promise<string | null>
      chooseImportFile: () => Promise<string | null>
    }
  }
}
