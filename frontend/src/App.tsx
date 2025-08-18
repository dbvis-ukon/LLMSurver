
import "@styles/index.css";
import * as Types from "Types";
import { useEffect, useState } from "react";
import {
  Card,
  Button,
  Badge,
  Checkbox,
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  CardBody,
  CardHeader,
  CheckboxGroup,
  Listbox,
  ListboxItem,
  Divider,
  Tooltip,
} from "@heroui/react";
import { FaRegTrashCan, FaCircleInfo } from "react-icons/fa6";
import Create from "@components/Create/Create";
import Graph from "@components/Statistics/Graph";
import Header from "@components/Table/Header";
import Papers from "@components/Table/Papers";
import OnboardingModal from "@components/OnboardingModal";
import { ONBOARDING_OPEN_EVENT} from "@components/OnboardingModal";


import {
  getPapersFromDB,
  deleteRunFromDB,
  getRunsFromDB,
  getRunFromDB
} from "./helpers/db";

export default function App() {
  const [originalPapers, setOriginalPapers] = useState<Types.Paper[]>([]);
  const [papers, setPapers] = useState<Types.Paper[]>([]);
  const EmptyRun: Types.RunInformation = {
    run_id: -1,
    alias: "New Run...",
    type: 0,
    prompt: "",
    created: "",
  };
  const [runOngoing, setRunOngoing] = useState(false);
  const [runs, setRuns] = useState<Types.RunInformation[]>([EmptyRun]);
  const [run, setRun] = useState<Types.RunInformation>(EmptyRun);
  const [runModels, setRunModels] = useState<string[]>([]);
  const [consensus, setConsensus] = useState<string[]>([]);
  const empty: Types.Statistic = {
    total: 0,
    classified: 0,
    included: 0,
    discarded: 0,
    includedBy: [],
  };
  const [statistic, setStatistic] = useState<Types.Statistic>(empty);
  const [searchedPapers, setSearchedPapers] = useState<Types.Paper[]>([]);

  useEffect(() => {
    getPapers();
    getRuns();
  }, []);

  async function getPapers() {
    try {
      const papers = await getPapersFromDB();
      setOriginalPapers(JSON.parse(JSON.stringify(papers)));
      setPapers(JSON.parse(JSON.stringify(papers)));
      setRun(EmptyRun);
      setStatistic((prev: any) => ({ ...prev, total: papers.length }));
    } catch (error) {
      console.error(error);
    }
  }

  async function getRuns(id?: number) {
    try {
      const results = await getRunsFromDB();
      const runs = [EmptyRun, ...results];
      setRuns(runs);
      if (id) {
        const firstAvailableRun = runs.find((run: Types.RunInformation) => run.run_id === id);
        if (firstAvailableRun)
          setRun(firstAvailableRun);
      }
    } catch (error) {
      console.error(error);
    }
  }

  useEffect(() => {
    if (runOngoing) {
      console.log("running");
    } else if (run.run_id !== -1) {
      getRun();
    }
  }, [runOngoing]);

  useEffect(() => {
    if (run.run_id === -1) {
      setPapers(JSON.parse(JSON.stringify(originalPapers)));
      setConsensus([]);
    } else if (!runOngoing) {
      getRun();
    }
  }, [run]);

  async function getRun() {
    try {
      const data = await getRunFromDB(run.run_id);

      if (data.run && data.run[0]) {
        const usedModels = data.run[0]!.model_responses.map(
          (response: Types.ModelResponse) => response.model_name
        );
        const newPapers: Types.Paper[] = [...data.run];
        papers.forEach((paper) => {
          const existing = newPapers.some(
            (newPaper) => newPaper.paper_id === paper.paper_id
          );
          if (!existing) {
            const updatedPaper = {
              ...paper,
              model_responses: usedModels.map((model: string) => ({
                model_name: model,
                classification: 0,
                answer: "",
              })),
            };
            newPapers.push(updatedPaper);
          }
        });
        handleConsensus(newPapers, usedModels);
        setRunModels(usedModels);
        setConsensus(usedModels);
      }
    } catch (error) {
      console.error(error);
    }
  }

  useEffect(() => {
    handleConsensus();
  }, [consensus]);

  function handleConsensus(newPapers?: Types.Paper[], newConsensus?: string[]) {
    const usedPapers = newPapers ? newPapers : [...papers];
    const usedConsensus = newConsensus ? newConsensus : [...consensus];
    if (usedPapers.length > 0 && usedPapers[0].model_responses) {
      if (usedConsensus.length > 0) {
        const result: Types.Paper[] = [];
        let includedBy = Array(usedConsensus.length).fill(0);
        let amounts = [0, 0];
        usedPapers.forEach((paper) => {
          const including: string[] = [];
          let discard = false;
          let con: Types.ConsensusClassification = 0;
          paper.model_responses!.forEach((response) => {
            if (usedConsensus.includes(response.model_name)) {
              if (response.classification === 1)
                including.push(response.model_name);
              else if (response.classification === 2) discard = true;
            }
          });
          if (including.length > 0) {
            includedBy[including.length - 1]++;
            amounts[0]++;
            con = 1;
          } else if (discard) {
            amounts[1]++;
            con = 2;
          }
          result.push({
            ...paper,
            consensus: con,
          });
        });
        setPapers(result);
        setStatistic((prev) => ({
          ...prev,
          classified: amounts[0] + amounts[1],
          included: amounts[0],
          discarded: amounts[1],
          includedBy: includedBy,
        }));
      } else {
        setPapers(
          usedPapers.map(({ consensus, ...paper }) => ({
            ...paper,
          }))
        );
        setStatistic({ ...empty, total: usedPapers.length });
      }
    } else {
      setStatistic({ ...empty, total: usedPapers.length });
    }
  }

  async function deleteRun() {
    try {
      const result = await deleteRunFromDB(run.run_id!);

      if (result.run) {
        setRun(EmptyRun);
        const old = [...runs];
        setRuns(old.filter((run) => run.run_id !== result.run));
      }
    } catch (error) {
      console.error(error);
    }
  }

  return (
    <div
      style={{
        padding: "10px",
        paddingBottom: "5px",
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
      }}
    >
      {/* Top Section */}
      <div
        style={{
          display: "flex",
          gap: "20px",
          flexWrap: "wrap",
          height: "20%",
        }}
      >
        <Create
          ids={papers.map((paper) => paper.paper_id)}
          getRuns={(run) => getRuns(run)}
          ongoing={runOngoing}
          setOngoing={setRunOngoing}
          papers={papers}
          setPapers={setPapers}
          currentRun={run}
        ></Create>
      </div>

      {/* Middle Section */}
      <div
        style={{
          display: "flex",
          gap: "20px",
          flexWrap: "wrap",
          height: "50%",
        }}
      >
        <Card style={{ flex: "1 1 70%", height: "100%" }}>
          <CardHeader>
            <Header
              ongoing={runOngoing}
              papers={papers}
              setPapers={setPapers}
              getPapers={getPapers}
              setSearchedPapers={setSearchedPapers}
              currentRun={run}
            ></Header>
          </CardHeader>
          <CardBody
            style={{
              marginTop: "-15px",
              display: "flex",
              flexDirection: "column",
              height: "100%",
            }}
          >
            <Papers papers={searchedPapers}></Papers>
          </CardBody>
        </Card>

        <div
          style={{
            width: "15%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            gap: "20px",
          }}
        >
          <Card style={{ flex: "1 1", height: "50%" }}>
            <CardHeader className="cardheader">Consensus</CardHeader>
            <CardBody
              style={{
                display: "flex",
                flexDirection: "column",
                height: "100%",
              }}
            >
              <div
                style={{
                  overflowY: "scroll",
                  overflowX: "hidden",
                  flexGrow: 1,
                }}
              >
                {papers.length > 0 && run.run_id !== -1 && (
                  <CheckboxGroup
                    value={consensus}
                    onValueChange={setConsensus}
                    isInvalid={consensus.length === 0}
                  >
                    {runModels.map((model, i) => (
                      <Checkbox color="success" value={model} key={i}>
                        {model}
                      </Checkbox>
                    ))}
                  </CheckboxGroup>
                ) || <span>No runs selected</span>}
              </div>
            </CardBody>
          </Card>

          <Card style={{ flex: "1 1", height: "40%" }}>
            <CardHeader className="cardheader">Statistics</CardHeader>
            <CardBody
              style={{
                display: "flex",
                flexDirection: "column",
                height: "100%",
              }}
            >
              <div
                style={{
                  overflowY: "scroll",
                  flexGrow: 1,
                }}
              >
                <Table
                  classNames={{
                    wrapper: "overflow-hidden, p-0 !important, py-4",
                  }}
                  style={{ marginTop: "-10px" }}
                  hideHeader
                  aria-label="Example static collection table"
                >
                  <TableHeader>
                    <TableColumn>Statistic</TableColumn>
                    <TableColumn>Value</TableColumn>
                  </TableHeader>
                  <TableBody>
                    {[
                      ...Object.entries(statistic).filter(
                        ([key]) => key !== "includedBy"
                      ),
                      ...(statistic.includedBy.length > 0
                        ? statistic.includedBy.map((value, i) => [
                          `included by ${i + 1}`,
                          value,
                        ])
                        : []),
                    ].map(([key, value]) => (
                      <TableRow key={key}>
                        <TableCell>
                          {String(key).charAt(0).toUpperCase() +
                            String(key).slice(1)}
                          :
                        </TableCell>
                        <TableCell style={{ color: "#3bcefb" }}>
                          {value}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>

      {/* Bottom Section */}
      <div
        style={{
          height: "25%",
          display: "flex",
          flexDirection: "row",
          gap: "20px"
        }}
      >
        <Card
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "row",
            gap: "20px",
          }}
        >
          <CardBody style={{ flex: 3, overflowY: "hidden" }}>
            <h3 className="title">Classification Distribution</h3>
            <div
              style={{
                margin: "10px",
                height: "90%",
                borderRadius: "10px",
                overflowY: "scroll",
              }}
            >
              {papers.length > 0 && run.run_id !== -1 && (
                <Graph
                  classifications={papers.map(
                    (paper) => paper.model_responses || []
                  )}
                  consensus={consensus}
                  type="dist"
                ></Graph>
              )}
            </div>
          </CardBody>
          <Divider
            style={{ height: "calc(100% - 20px)", marginTop: "10px" }}
            orientation="vertical"
          />
          <CardBody style={{ flex: 3, overflowY: "hidden" }}>
            <h3 className="title">LLM Agreement</h3>
            <div
              style={{
                margin: "10px",
                height: "90%",
                borderRadius: "10px",
                overflowY: "scroll",
              }}
            >
              {papers.length > 0 && run.run_id !== -1 && (
                <Graph
                  classifications={papers.map(
                    (paper) => paper.model_responses || []
                  )}
                  consensus={consensus}
                  type="except"
                ></Graph>
              )}
            </div>
          </CardBody>
          <Divider
            style={{ height: "calc(100% - 20px)", marginTop: "10px" }}
            orientation="vertical"
          />



          <CardBody style={{ flex: 1, paddingLeft: 0, display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
            <div className="cardheader" style={{ flex: "none" }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                }}
              >
                <Badge color="default" content={runs.length-1} size="md" placement="top-right" shape="rectangle">
                  <div style={{marginRight: "10px"}}>Runs</div>
                </Badge>
                <Tooltip showArrow={true} content="Delete selected run">
                  <Button
                    isDisabled={run.run_id <= 0}
                    size="sm"
                    isIconOnly
                    aria-label="Delete"
                    onPress={deleteRun}
                  >
                    <FaRegTrashCan />
                  </Button>
                </Tooltip>
              </div>
            </div>

            <div style={{ flex: 1, paddingTop: "0.75rem", minHeight: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
              <div
                style={{
                  flex: 1,
                  marginTop: "10px",
                  overflowY: "auto",
                  minHeight: 0,
                }}
                className="border-small px-1 py-2 rounded-small border-default-200 dark:border-default-100"
              >
                <Listbox
                  aria-label="Runs"
                  selectionMode="single"
                  onAction={(id) =>
                    setRun(runs.find((r) => r.run_id === Number(id)) || EmptyRun)
                  }
                  classNames={{
                    base: "h-full max-w-xs",
                    list: "overflow-auto h-full",
                  }}
                >
                  {runs.map((item) => (
                    <ListboxItem
                      key={item.run_id}
                      style={{ maxHeight: "40px" }}
                      className={
                        item.run_id === run.run_id
                          ? "bg-default text-default-foreground"
                          : ""
                      }
                      isDisabled={runOngoing}
                    >
                      {(item.type === 1 ? "Sample: " : "") +
                        item.alias
                          .split("_")
                          .map(
                            (word) => word.charAt(0).toUpperCase() + word.slice(1)
                          )
                          .join(" ")}
                    </ListboxItem>
                  ))}
                </Listbox>
              </div>
            </div>
          </CardBody>

        </Card>
      </div>

      {/* Footer Section */}
      <footer className="text-gray-400 flex justify-between items-center" style={{marginTop: "0px", fontSize: "10px"}}>
        <div className="text-left"><span><a href="https://github.com/dbvis-ukon/LLMSurver" target="_blank" rel="noopener noreferrer">Github</a></span><span> | </span><span style={{userSelect: "none"}}>Please cite as: </span><span><a href="https://orcid.org/0000-0001-7049-5203">Lucas Joos</a>, <a href="https://orcid.org/0000-0001-7966-9740">Daniel A. Keim</a>, and <a href="https://orcid.org/0000-0001-8076-1376">Maximilian T. Fischer</a>. <i>"Cutting Through the Clutter: The Potential of LLMs for Efficient Filtration in Systematic Literature Reviews"</i> in EuroVis Workshop on Visual Analytics (EuroVA), 2025. doi: <a href="https://doi.org/10.2312/eurova.20251105">10.2312/eurova.20251105</a></span></div>
        <div className="text-end"><a href="https://www.vis.uni-konstanz.de">DBVIS Research Lab, University of Konstanz, 2025</a>&nbsp; |  &nbsp;
          <a href="https://www.vis.uni-konstanz.de/en/imprint">Legal Notice</a> | <a href="https://www.vis.uni-konstanz.de/en/datenschutz">Data Protection</a>
        </div>
      </footer>
      <OnboardingModal></OnboardingModal>
      <Tooltip showArrow={true} content="Help">
      <div style={{
                    cursor: "pointer",
                    height: "24px",
                    position: "fixed",
                    right: "20px",
                    zIndex: "5",
                    bottom: "20px",
                    boxShadow: "1px 3px 1px black"
                }}>
                  <FaCircleInfo size="25px" onClick={() => window.dispatchEvent(new Event(ONBOARDING_OPEN_EVENT))} />
                </div>
      </Tooltip>
    </div>
  );
}
