import { GetColorByID, SetColorByID } from "../src/colors";
import { CustomWindow } from "../src/types";
import { DoModal, GetTemplateNameFromID } from "../src/ui";
import { ElementByID } from "../src/utils";
import { GLDraw } from "../src/webgl";

declare let window: CustomWindow;

export default function (event: MouseEvent): void {
  const modal_object = DoModal(GetTemplateNameFromID(event));
  const state = window.MAFFTMSAViewer.State;

  //Get colors
  SetColorByID("MAFFTMSAViewerBackgroundColor", state.BackgroundColor);
  SetColorByID("MAFFTMSAViewerSeparatorColor", state.SeparatorColor);
  SetColorByID("MAFFTMSAViewerLabelTextColor", state.LabelTextColor);
  SetColorByID("MAFFTMSAViewerLabelTextBGColor", state.LabelTextBGColor);
  SetColorByID("MAFFTMSAViewerScrollbarBGColor", state.ScrollbarBGColor);
  SetColorByID(
    "MAFFTMSAViewerScrollbarHandleColor",
    state.ScrollbarHandleColor
  );

  ElementByID("MAFFTMSAViewerApplyButton").onclick = async function () {
    //Set colors
    state.BackgroundColor = GetColorByID("MAFFTMSAViewerBackgroundColor");
    state.SeparatorColor = GetColorByID("MAFFTMSAViewerSeparatorColor");
    state.LabelTextColor = GetColorByID("MAFFTMSAViewerLabelTextColor");
    state.LabelTextBGColor = GetColorByID("MAFFTMSAViewerLabelTextBGColor");
    state.ScrollbarBGColor = GetColorByID("MAFFTMSAViewerScrollbarBGColor");
    state.ScrollbarHandleColor = GetColorByID(
      "MAFFTMSAViewerScrollbarHandleColor"
    );

    //Redraw screen to apply changes
    if (state.Initialized) {
      GLDraw();
    }
    //Disconnect our onclick to avoid leaking the load button element
    ElementByID("MAFFTMSAViewerApplyButton").onclick = null;
    //Hide modal
    modal_object.hide();
  };

  return;
}
