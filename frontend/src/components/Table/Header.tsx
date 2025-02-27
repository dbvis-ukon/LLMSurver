import {
  Button,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalHeader,
  Spacer,
  Textarea,
  Tooltip,
} from "@heroui/react";
import { useEffect, useRef, useState } from "react";
import { FaFileDownload, FaFileUpload, FaUpload } from "react-icons/fa";
import { FaCircleCheck, FaShuffle } from "react-icons/fa6";
import * as Types from "Types";

interface Props {
  ongoing: boolean;
  papers: Types.Paper[];
  setPapers: (p: Types.Paper[]) => void;
  getPapers: () => void;
  setSearchedPapers: (p: Types.Paper[]) => void;
  currentRun: Types.Run;
}

export default function Header({
  ongoing,
  papers,
  setPapers,
  getPapers,
  setSearchedPapers,
  currentRun,
}: Props) {
  const [showModal, setShowModal] = useState<string>("");
  const [manual, setManual] = useState("");
  const [err, setErr] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const keysToInclude = ["document_title", "authors", "doi", "year"];
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (ongoing) {
      setSearch("");
    }
  }, [ongoing]);

  useEffect(() => {
    const regex = new RegExp(
      search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
      "i"
    );
    const copy = JSON.parse(JSON.stringify(papers));
    const updated = copy.filter((paper: Types.Paper) =>
      Object.keys(paper)
        .filter((key) => keysToInclude.includes(key))
        .some((key) => regex.test(String(paper[key as keyof typeof paper])))
    );
    setSearchedPapers(updated);
  }, [search, papers]);

  async function handleSubmit(input: File | string | null) {
    if (input === null) {
      return;
    }
    const formData = new FormData();
    if (input instanceof File) formData.append("file", input);
    else if (input === "manual") formData.append("text", manual);
    try {
      const response = await fetch("/api/insert_papers", {
        method: "POST",
        body: formData,
      });
      const data = await response.json();
      if (data.error) {
        setManual("");
        setShowModal("error");
        setErr(data.error);
      } else {
        getPapers();
        if (input === "manual") {
          setManual("");
          setShowModal("");
        }
      }
    } catch (error) {
      setManual("");
      setShowModal("error");
      setErr(String(error));
    }
  }

  // Enables the option to do samples for different subsets of papers
  function shufflePapers() {
    const copy = JSON.parse(JSON.stringify(papers));
    let currentIndex = copy.length,
      randomIndex;

    while (currentIndex > 0) {
      randomIndex = Math.floor(Math.random() * currentIndex);
      currentIndex--;
      [copy[currentIndex], copy[randomIndex]] = [
        copy[randomIndex],
        copy[currentIndex],
      ];
    }
    setPapers(copy);
  }

  async function exportPapers() {
    try {
      const con =
        currentRun.run_id >= 0 ? papers.map((paper) => paper.consensus) : [];
      const response = await fetch("/api/export_papers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          run_id: currentRun.run_id,
          alias: currentRun.alias,
          consensus: con,
        }),
      });
      const blob = await response.blob();
      if (blob.type === "application/json") {
        console.error("Download didn't work");
        return;
      }
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = currentRun.alias;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error(error);
    }
  }

  return (
    <>
      <div
        className="flex items-center space-x-4"
        style={{
          maxHeight: "30px",
          width: "100%",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span
          className="title"
          style={{
            marginTop: "-15px",
            whiteSpace: "nowrap",
            width: "max-content",
          }}
        >
          Paper Corpus
        </span>
        <Input
          className="w-10/12"
          isClearable
          size="sm"
          variant="bordered"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onClear={() => setSearch("")}
          placeholder="Search"
          isDisabled={ongoing}
        />
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            marginTop: "0px",
          }}
        >
          <Tooltip showArrow={true} content="Import Text">
            <Button
              isDisabled={ongoing}
              size="sm"
              isIconOnly
              aria-label="Text"
              onPress={() => setShowModal("text")}
            >
              <FaUpload />
            </Button>
          </Tooltip>
          <Spacer x={2} />
          <Tooltip showArrow={true} content="Import BibTex-File">
            <Button
              isDisabled={ongoing}
              size="sm"
              isIconOnly
              aria-label="File"
              onPress={() => fileInputRef.current?.click()}
            >
              <FaFileUpload />
            </Button>
          </Tooltip>
          <input
            type="file"
            style={{
              fontSize: "100px",
              position: "absolute",
              left: "-9999px",
              opacity: "0",
            }}
            onChange={(e) =>
              handleSubmit(e.target.files ? e.target.files[0] : null)
            }
            ref={fileInputRef}
          />
          <Spacer x={2} />
          <Tooltip showArrow={true} content="Export Results">
            <Button
              isDisabled={ongoing}
              size="sm"
              isIconOnly
              aria-label="Export"
              onPress={exportPapers}
            >
              <FaFileDownload />
            </Button>
          </Tooltip>
          <Spacer x={2} />
          <Tooltip showArrow={true} content="Shuffle Papers">
            <Button
              isDisabled={ongoing}
              size="sm"
              isIconOnly
              aria-label="Shuffle"
              onPress={shufflePapers}
            >
              <FaShuffle />
            </Button>
          </Tooltip>
        </div>
      </div>
      <Modal
        className="dark text-foreground bg-background"
        isOpen={showModal === "text"}
        onOpenChange={() => setShowModal("")}
      >
        <ModalContent>
          <ModalHeader>Add DOI or BibTeX</ModalHeader>
          <ModalBody>
            <Textarea
              key="textarea"
              variant="faded"
              placeholder="Insert your text here..."
              classNames={{
                base: "max-h-[80%]",
                input: "max-h-[100%]",
              }}
              style={{ fontSize: "10pt", padding: "10px" }}
              value={manual}
              onChange={(e) => setManual(e.target.value)}
            />
            <Tooltip showArrow={true} content="Submit Text">
              <Button
                isDisabled={manual.length === 0}
                isIconOnly
                onPress={() => handleSubmit("manual")}
              >
                <FaCircleCheck />
              </Button>
            </Tooltip>
          </ModalBody>
        </ModalContent>
      </Modal>
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
