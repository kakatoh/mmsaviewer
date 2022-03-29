import { CustomWindow } from "../src/types";
import { DoModal, GetTemplateNameFromID, LoadURL } from "../src/ui";
import { ElementByID } from "../src/utils";

declare let window: CustomWindow;

export default function (event: MouseEvent): void {
  const modal_object = DoModal(GetTemplateNameFromID(event));
  ElementByID("MAFFTMSAViewerLoadButton").onclick = async function () {
    //Grab user input before we destroy the modal
    const input_box = ElementByID(
      "MAFFTMSAViewerURLInputBox"
    ) as HTMLInputElement;
    const url = input_box.value;
    //Disconnect our onclick to avoid leaking the load button element
    ElementByID("MAFFTMSAViewerLoadButton").onclick = null;
    //Hide modal
    modal_object.hide();
    //Load
    await LoadURL(url);
  };

  return;
}
