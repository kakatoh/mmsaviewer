import { CustomWindow } from "../src/types";
import { DoModal, GetTemplateNameFromID, RecoverableError } from "../src/ui";
import { ElementByID, NewError } from "../src/utils";
import { GLDraw } from "../src/webgl";

declare let window: CustomWindow;

export default function (event: MouseEvent): void {
  //Initialize
  const state = window.MAFFTMSAViewer.State;
  if (!state.Initialized) {
    RecoverableError(NewError("Error", "Aligment has not yet been loaded."));
    return;
  }

  //Prepare data
  GLDraw();
  const data = state.Canvas.toDataURL("image/png", 1);

  //Draw modal and link our data
  const modal_object = DoModal(GetTemplateNameFromID(event));
  const link = ElementByID(
    "MAFFTMSAViewer_menu_file_export_png_link"
  ) as HTMLAnchorElement;
  link.href = data;

  return;
}
