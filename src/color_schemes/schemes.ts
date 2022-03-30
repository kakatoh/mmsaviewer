import { ColorDictCollection } from "../types";
import BuriedIndex from "./buried_index";
import Cinema from "./cinema";
import Clustal from "./clustal";
import Clustal2 from "./clustal2";
import HelixPropensity from "./helix_propensity";
import Hydrophobicity from "./hydrophobicity";
import JalviewNucleotide from "./jalview_nucleotide";
import Lesk from "./lesk";
import Mae from "./mae";
import MAFFTNucleotide from "./mafft_nucleotide";
import Miyata from "./miyata";
import PurinePyrimidine from "./purine_pyrimidine";
import StrandPropensity from "./strand_propensity";
import Taylor from "./taylor";
import TurnPropensity from "./turn_propensity";
import Zappo from "./zappo";

let ColorCollection: ColorDictCollection = {};

ColorCollection[BuriedIndex.Name] = BuriedIndex;
ColorCollection[Cinema.Name] = Cinema;
ColorCollection[Clustal2.Name] = Clustal2;
ColorCollection[Clustal.Name] = Clustal;
ColorCollection[HelixPropensity.Name] = HelixPropensity;
ColorCollection[Hydrophobicity.Name] = Hydrophobicity;
ColorCollection[JalviewNucleotide.Name] = JalviewNucleotide;
ColorCollection[Lesk.Name] = Lesk;
ColorCollection[Mae.Name] = Mae;
ColorCollection[MAFFTNucleotide.Name] = MAFFTNucleotide;
ColorCollection[Miyata.Name] = Miyata;
ColorCollection[PurinePyrimidine.Name] = PurinePyrimidine;
ColorCollection[StrandPropensity.Name] = StrandPropensity;
ColorCollection[Taylor.Name] = Taylor;
ColorCollection[TurnPropensity.Name] = TurnPropensity;
ColorCollection[Zappo.Name] = Zappo;

export { ColorCollection };
