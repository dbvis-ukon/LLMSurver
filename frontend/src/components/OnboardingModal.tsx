import "@styles/index.css";
import { useEffect, useState } from "react";
import { Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Card,
  CardBody,
  Image
} from "@heroui/react";


type Slide = {
  imageSrc: string; 
  imageAlt?: string;
  title: string;
  description: string;
};

export const ONBOARDING_OPEN_EVENT = "onboarding:open";

const defaultSlides: Slide[] = [
    {
    imageSrc: "/images/onboarding/05.png",
    imageAlt: "Main UI",
    title: "LLMSurver",
    description:
     `Automatic LLM-based literature review filtering inside your browser (<a href="https://github.com/dbvis-ukon/LLMSurver" target="_blank" rel="noopener noreferrer"><u>@Github</u></a>). The key features are: <br /><br />
<ul style="text-align:left; list-style: disc">
<li><b>Fast</b>: Reduces filtering time for academic corpora from weeks to minutes</li>
<li><b>Accurate</b>: A multi-LLM consensus scheme can achieve recall rates > 98.8%, often better than humans</li>
<li><b>Interactive</b>: Interactively refine your research direction, using prompt refinement, resampling, and different LLM agents</li>
<li><b>Easy</b>: Try it out directly in your browser, no installation needed</li>
<li><b>Flexible</b>: Supports any OpenAI-compatible LLM endpoints, enabling you to use both commercial as well as locally-run LLMs</li>
<li><b>Privacy</b>: LLMsurver is entirely browser-based, the paper corpus is only provided to LLMs that you supply and control</li>
</ul><br />
<span stlye="font-size: 10px">Authors: Lucas Joos, Daniel A. Keim, Maximilian T. Fischer, DBVIS Research Lab, University of Konstanz, 2025</span>
`,
  },
  {
    imageSrc: "/images/onboarding/01.png",
    imageAlt: "Paper corpus",
    title: "Add your paper corpus",
    description:
      "You can import Bibtex file(s) with abstracts or manually input DOIs.",
  },
  {
    imageSrc: "/images/onboarding/02.png",
    imageAlt: "Paper Overview",
    title: "Paper Overview",
    description:
      "Once importd, the central paper view shows all imported papers and their metadata.",
  },
  {
    imageSrc: "/images/onboarding/03.png",
    imageAlt: "add LLMs",
    title: "Connect your LLMs",
    description:
      "Next, connect your preffered LLMs (commercial or locally running) using an OpenAI-compatible API server.",
  },
  {
    imageSrc: "/images/onboarding/01.png",
    imageAlt: "Prompt rwirting",
    title: "Customize your prompt",
    description:
      "Customize your prompt to describe your research topic and exclusion/inclusion criteria.",
  },
  {
    imageSrc: "/images/onboarding/04.png",
    imageAlt: "llm classification",
    title: "Let the LLMs classify your papers",
    description:
      "After selecting the LLMs and clicking run, the system let's each paper be voted by ",
  },
  {
    imageSrc: "/images/onboarding/05.png",
    imageAlt: "All set",
    title: "Check results - You're all set",
    description:
      "Review results anytime and adapt the consens scheme. Let's finish the onboarding.",
  },
];

export default function OnboardingModal() {

  const KeyLSShown = "onboarding-finished";
  const isOnboardingFinished = localStorage.getItem(KeyLSShown) || 'no';

  const [isOpen, setOpenState] = useState(isOnboardingFinished != 'yes');
  const [index, setIndex] = useState(0);
  const isFirst = index === 0;
  const isLast = index === defaultSlides.length - 1;

  

  useEffect(() => {
    if (isOpen) setIndex(0);
  }, [isOpen]);

  useEffect(() => {
    const open = () => setOpenState(true);
    window.addEventListener(ONBOARDING_OPEN_EVENT, open);
    if (!isOpen) 
        return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") next();
      else if (e.key === "ArrowLeft") prev();
      else if (e.key === "Escape") setOpenState(false);
    };
    window.addEventListener("keydown", onKey);

    return () => {
        window.removeEventListener(ONBOARDING_OPEN_EVENT, open);
        window.removeEventListener("keydown", onKey);
    }
  }, [isOpen, index]);

  const next = () => setIndex((i) => Math.min(i + 1, defaultSlides.length - 1));
  const prev = () => setIndex((i) => Math.max(i - 1, 0));

  const hidePermanently = () => {
        localStorage.setItem(KeyLSShown, "yes");
        setOpenState(false);
  }

  const handleContinue = () => {
    if (isLast) {
        hidePermanently()
    } else {
      next();
    }
  };

  const currentSlide = defaultSlides[index];

  return (
    <Modal 
        className="dark text-foreground bg-background"
        isOpen={isOpen}
        onOpenChange={() => setOpenState(!isOpen)}
        size="5xl"
        backdrop="blur">
    <ModalContent>
      <ModalHeader>
        <h2>Welcome to LLMSurver!</h2>
      </ModalHeader>
      <ModalBody>
        <Card shadow="sm" radius="lg" className="mb-6">
            <CardBody className="flex items-center justify-center p-4">
              {/* Use a fixed aspect for smoother layout; swap images freely */}
              <div className="relative w-full max-w-[520px] aspect-[16/9]">
                <Image
                  src={currentSlide.imageSrc}
                  alt={currentSlide.imageAlt ?? currentSlide.title}
                  className="object-contain"
                />
              </div>
            </CardBody>
          </Card>

          {/* Title & description */}
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-semibold tracking-tight">
              {currentSlide.title}
            </h2>
            <p className="text-default-500 max-w-[50rem] mx-auto" dangerouslySetInnerHTML={{__html: currentSlide.description}}>
            </p>
          </div>

          {/* Progress dots */}
          <div className="flex items-center justify-center gap-2 mt-4">
            {defaultSlides.map((_, i) => {
              const active = i === index;
              return (
                <button
                  key={i}
                  aria-label={`Go to slide ${i + 1}`}
                  onClick={() => setIndex(i)}
                  className={[
                    "h-2.5 rounded-full transition-all",
                    active ? "w-6 bg-primary" : "w-2.5 bg-default-300/70 hover:bg-default-400",
                  ].join(" ")}
                />
              );
            })}
          </div>
        
      </ModalBody>
      <ModalFooter>
        <div className="flex w-full items-center justify-between">
            {/* Left controls: Skip or Back */}
            <div className="flex gap-2">
                <Button variant="light" onPress={hidePermanently} aria-label="Skip">
                  Do not show again
                </Button>
            </div>

            {/* Right controls: Continue / Finish */}
            <div className="flex gap-2">
              {!isFirst && (
                <Button variant="light" onPress={prev} aria-label="Back">
                  Back
                </Button>
              )}
              <Button color="primary" onPress={handleContinue} aria-label={isLast ? "Finish" : "Continue"}>
                {isLast ? "Get Started" : "Continue"}
              </Button>
            </div>
          </div>
      </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

/*
<p>
          This tool helps you efficiently filter papers using LLMs. 
          <br />
          <br />
          <b>How to get started:</b>
          <ul>
            <li>Import your papers using a DOI or Bibtex file</li>
            <li>Add your LLM endpoints</li>
            <li>Modify the default prompt to describe your research</li>
            <li>Select run</li>
            <li>Review papers and model responses</li>
            <li>Adjust consensus scheme and view statistics</li>
          </ul>
        </p>
        **/