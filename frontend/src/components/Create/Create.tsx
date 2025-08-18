
import { useEffect, useState, useRef } from "react";
import RunParallel from "run-parallel";
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Checkbox,
  CheckboxGroup,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalHeader,
  Spacer,
  Textarea,
  Tooltip,
  Progress,
} from "@heroui/react";
import { FaPenToSquare, FaArrowRotateLeft} from "react-icons/fa6";
import Setup from "./Setup";
import * as Types from "Types";

import { classifyViaLLM } from "../../helpers/llm";
import { getModelsFromDB, setRunToDB } from "../../helpers/db";

interface Props {
  ids: number[];
  getRuns: (id: number) => void;
  ongoing: boolean;
  setOngoing: (s: boolean) => void;
  papers: Types.Paper[];
  setPapers: (p: Types.Paper[]) => void;
  currentRun: Types.RunInformation;
}

export default function Create({
  ids,
  getRuns,
  ongoing,
  setOngoing,
  papers,
  setPapers,
  currentRun,
}: Props) {
  const sampleLength = 5;
  const [showModal, setShowModal] = useState<string>("");
  const defaultPrompt =
    "You are a professor in computer science conducting a literature review.\nPlease decide and classify if the following paper belongs to a specific research direction or not.\nFor this, you are provided with the title and the abstract, which should give you sufficient information for an informed and accurate decision.\nThe research direction is the topic of 'TITEL'.\nTherefore include papers that deal with ASPECT1, ASPECT2, ... Examples of ASPECT1 are: term 1, term 2.\n\nYou MUST discard papers that EXCLUSION_EXCEPTION_1,EXCLUSION_EXCEPTION_2,...\n\nYou MUST include papers that INCLUSION_EXCEPTION_1, INCLUSION_EXCEPTION_2, ...";
  const KeyLSPrompt = "prompt-last-saved";
  const lastSavedPrompt = localStorage.getItem(KeyLSPrompt) || defaultPrompt;
  const [prompt, setPrompt] = useState<string>(lastSavedPrompt);
  const [models, setModels] = useState<Types.Model[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [runName, setRunName] = useState("");
  const [err, setErr] = useState("");
  const [runProgress, setRunProgress] = useState(0);
  const runOngoingRef = useRef(false);
  const alreadyClassified = useRef(0);
  const classificationTarget = useRef(0);

  useEffect(() => {
    getModels();
  }, []);

  function updatePrompt(prompt: string) {
    localStorage.setItem(KeyLSPrompt, prompt);
    setPrompt(prompt);
  }

  // If a run is selected, shows prompt used while run was created
  useEffect(() => {
    updatePrompt(currentRun.run_id === -1 ? lastSavedPrompt : currentRun.prompt);
    setRunName(currentRun.run_id === -1 ? "" : currentRun.alias);
  }, [currentRun]);

  useEffect(() => {
    runOngoingRef.current = ongoing;
  }, [ongoing]);

  async function getModels() {
    try {

      const models = await getModelsFromDB();
      setModels(models);
    } catch (error) {
      console.error(error);
    }
  }

  function handleCancel() {
    console.log("Canceled run");
    setOngoing(false);
  }

  async function handleSubmit(sample: boolean = false) {
    // Shows error modal if information is missing
    if (ids.length === 0) {
      setErr("Upload papers first");
      setShowModal("error");
    } else if (prompt.length === 0) {
      setErr("Prompt can't be empty");
      setShowModal("error");
    } else if (selected.length === 0) {
      setErr("Select at least one model");
      setShowModal("error");
    } else if (runName.length === 0) {
      setErr("A run name must be given");
      setShowModal("error");
    } else {
      // Results length will be amount of models * amount of papers
      classificationTarget.current =
        selected.length * (sample ? sampleLength : ids.length);

      if (classificationTarget.current < 1) return;

      alreadyClassified.current = 0;
      setRunProgress(0);
      setOngoing(true);
      runOngoingRef.current = true;

      try {
        const result = await setRunToDB({
            prompt: prompt,
            ...(sample && { ids: ids.slice(0, sampleLength) }),
            name: runName,
          })
        
        if (result.run) {
          // Runs each selected model at the same time
          RunParallel(
            selected.map((name) => {
              return async function () {
                classifyPapers(result.run, ids, name, prompt, sample);
              };
            })
          );
          getRuns(result.run);
        }
      } catch (error) {
        console.error(error);
      }
    }
  }

  async function classifyPapers(
    runId: number,
    paperIds: number[],
    model: string,
    prompt: string,
    sample: boolean = false
  ) {
    let currIdx = 0;
    while (
      runOngoingRef.current &&
      currIdx < (sample ? sampleLength : paperIds.length)
    ) {
      try {
        const data = await classifyViaLLM({
            model: model,
            prompt: prompt,
            paper_id: paperIds[currIdx],
            run_id: runId,
          })
        alreadyClassified.current += 1;
        // Updates progression bar
        setRunProgress(
          (100.0 * alreadyClassified.current) / classificationTarget.current
        );

        if (data) {

          const error: boolean = data.classification == 3;
          if (error)
            console.warn((data.model_name, data.answer));

          let npaper = papers;

          const pid = npaper.findIndex((v, _) => {
            return v.paper_id == data.paper_id;
          });

          // Checks if current paper already has a model response
          // If not, response array is added to the paper
          if (!npaper[pid].model_responses) npaper[pid].model_responses = [];

          // Adds current response to the model response array
          if (pid >= 0) {

            npaper[pid].model_responses!.push({
                model_name: data.model_name,
                classification: data.classification,
                answer: data.answer,
            });

            setPapers([...npaper]);
          }
        }
      } catch (error) {
        console.error(error);
      }

      currIdx += 1;
    }

    if (alreadyClassified >= classificationTarget) setOngoing(false);

    console.log("Done for " + model);
  }

  return (
    <>
      <Card style={{ flex: "1 1 70%", height: "100%" }}>
        <CardHeader className="cardheader">
          <div
            style={{
              flex: "1 1",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <Tooltip showArrow={true} content="LLM-Surver - An automatic structured literature review creation tool filtering a paper corpus using LLMs while runing entirely in your browser.">
                <span className="text-lg">LLMSurver</span>
              </Tooltip>
               <span> - Prompt Definition</span>
               <span className="text-gray-300" style={{ marginLeft: "0.5em", fontSize: "8pt"}}>
            Prompt will automatically be appended with: "Below is the title and abstract. You must only answer with INCLUDE
            or DISCARD and a 2-sentence reason of why."
              </span>
               </div>
            <Tooltip showArrow={true} content="Reset to default prompt template">
              <Button
                style={{ marginTop: "7px" }}
                size="sm"
                isIconOnly
                onClick={() => updatePrompt(defaultPrompt)}
              >
                <FaArrowRotateLeft />
              </Button>
            </Tooltip>
          </div>
          
          </CardHeader>
        <CardBody
          style={{
            overflowY: "hidden",
          }}
        >
          <Textarea
            disabled={ongoing || currentRun.run_id >= 0}
            key="textarea"
            variant="faded"
            placeholder="Insert your prompt here..."
            classNames={{
              input: "max-h-[100%]",
            }}
            style={{ fontSize: "10pt", padding: "5px", height: "auto" }}
            value={prompt}
            onChange={(e) => updatePrompt(e.target.value)}
          />
        </CardBody>
      </Card>

      {/* Checklist Module */}
      <Card style={{ flex: "1 1 20%", height: "100%" }}>
        <CardHeader className="cardheader">
          <div
            style={{
              flex: "1 1",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span>LLM Selection</span>
            <Tooltip showArrow={true} content="Add/Edit LLMs">
              <Button
                isDisabled={ongoing}
                style={{ marginTop: "7px" }}
                size="sm"
                isIconOnly
                onPress={() => setShowModal("LLMs")}
              >
                <FaPenToSquare />
              </Button>
            </Tooltip>
          </div>
        </CardHeader>
        <CardBody
          style={{ display: "flex", flexDirection: "column", height: "100%" }}
        >
          <div style={{ maxHeight: "150px", overflowY: "scroll", flexGrow: 1 }}>
            <CheckboxGroup
              isDisabled={ongoing}
              orientation="horizontal"
              value={selected}
              onValueChange={setSelected}
            >
              {models.map((item, index) => (
                <Checkbox
                  size="sm"
                  value={item.name}
                  color="success"
                  key={index}
                >
                  {item.name}
                </Checkbox>
              ))}
            </CheckboxGroup>
            {models.length > 0 && (
              <Checkbox
                isDisabled={ongoing}
                className="mt-1"
                size="md"
                color="success"
                isSelected={selected.length === models.length}
                onValueChange={(set) =>
                  setSelected(set ? models.map((model) => model.name) : [])
                }
              >
                All
              </Checkbox>
            )}
          </div>

          {/* Run Name and Control Buttons */}
          <Spacer y={1} />
          {ongoing && (
            <>
              <Progress
                aria-label="Classifying..."
                className="max-w-md"
                color="primary"
                showValueLabel={true}
                size="md"
                value={runProgress}
              />
              <Spacer y={1} />
            </>
          )}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginTop: "10px",
            }}
          >
            {!ongoing && (
              <>
                <Input
                  placeholder="Run Name"
                  fullWidth
                  style={{ backgroundColor: "inherit", color: "white" }}
                  value={runName}
                  onChange={(e) => setRunName(e.target.value)}
                />
                <Spacer x={2} />
                <Tooltip
                  hidden={currentRun.run_id < 0}
                  showArrow={true}
                  content="Select 'New Run...' run to start!"
                >
                  <span>
                    <Button
                      isDisabled={currentRun.run_id >= 0}
                      onPress={() => handleSubmit(true)}
                    >
                      Sample
                    </Button>
                  </span>
                </Tooltip>
                <Spacer x={2} />
                <Tooltip
                  hidden={currentRun.run_id < 0}
                  showArrow={true}
                  content="Select 'New Run...' run to start!"
                >
                  <span>
                    <Button
                      isDisabled={currentRun.run_id >= 0}
                      onPress={() => handleSubmit()}
                    >
                      Start Run
                    </Button>
                  </span>
                </Tooltip>
              </>
            )}
            {ongoing && (
              <Button onPress={() => handleCancel()}>Cancel Run</Button>
            )}
          </div>
        </CardBody>
      </Card>
      <Setup
        onClose={() => setShowModal("")}
        showModal={showModal === "LLMs"}
        models={models}
        getModels={getModels}
      ></Setup>
      <Modal
        className="dark text-danger"
        classNames={{
          closeButton: "text-danger",
        }}
        isOpen={showModal === "error"}
        onOpenChange={() => setShowModal("")}
        scrollBehavior="inside"
      >
        <ModalContent>
          <ModalHeader>Error!</ModalHeader>
          <ModalBody>{err}</ModalBody>
        </ModalContent>
      </Modal>
    </>
  );
}
