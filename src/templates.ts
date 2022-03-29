import { HTMLTemplateDict } from "./types";
const zip = require("@zip.js/zip.js/dist/zip-full");

export class HTMLTemplates {
  private templates: HTMLTemplateDict;

  constructor() {
    this.templates = {};
  }

  public async load(template_zip_url: string) {
    const reader = new zip.HttpReader(template_zip_url, { useXHR: true });
    const data = new zip.ZipReader(reader, { useWebWorkers: false });
    const entries = await data.getEntries();
    for (var entry of entries) {
      var writer = new zip.TextWriter();
      var filename = entry.filename.split(".")[0];
      var contents = await entry.getData(writer);
      this.templates[filename] = contents;
    }
    data.close();
  }

  public Run(template_path: string): string {
    if (!this.templates.hasOwnProperty(template_path)) {
      console.log(`Template does not exist: ${template_path}`);
      return `<div>Template does not exist: ${template_path}</div>`;
    }
    return this.templates[template_path];
  }
}
