import { CustomWindow } from "../src/types";
import { DoModal, GetTemplateNameFromID } from "../src/ui";
import { ElementByID } from "../src/utils";

declare let window: CustomWindow;

export default function (event: MouseEvent): void {
  const modal_object = DoModal(GetTemplateNameFromID(event));
  const state = window.MAFFTMSAViewer.State;

  const version_string = "Version " + state.HTMLTemplates.Run("version");
  ElementByID("MAFFTMSAViewerVersionLabel").innerHTML = version_string;

  return;
}
