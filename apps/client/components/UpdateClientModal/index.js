import React, { useState, Fragment } from "react";
import { Dialog, DialogBackdrop, Transition } from "@headlessui/react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { useRouter } from "next/router";
import { Button } from "@/shadcn/ui/button";
import { Input } from "@/shadcn/ui/input";
import { Label } from "@/shadcn/ui/label";

export default function UpdateClientModal({ client }) {
  const [open, setOpen] = useState(false);

  const [contactMethod, setContactMethod] = useState(
    client.number || client.contactName
  );
  const [name, setName] = useState(client.name);
  const [email, setEmail] = useState(client.email);

  const router = useRouter();

  async function updateClient() {
    await fetch("/api/v1/admin/client/update", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        number: contactMethod,
        contactName: contactMethod,
        name,
        email,
        id: client.id,
      }),
    });
  }

  return (
    <div>
      <Button onClick={() => setOpen(true)} type="button">
        Edit
      </Button>

      <Transition.Root show={open} as={Fragment}>
        <Dialog
          as="div"
          className="fixed z-10 inset-0 overflow-y-auto"
          onClose={setOpen}
        >
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0"
              enterTo="opacity-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100"
              leaveTo="opacity-0"
            >
              <DialogBackdrop className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
            </Transition.Child>

            <span
              className="hidden sm:inline-block sm:align-middle sm:h-screen"
              aria-hidden="true"
            >
              &#8203;
            </span>
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            >
              <div className="inline-block align-bottom rounded-lg bg-card/90 px-4 pt-5 pb-4 text-left shadow-xl backdrop-blur transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
                <div className="hidden sm:block absolute top-0 right-0 pt-4 pr-4">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setOpen(false)}
                  >
                    <span className="sr-only">Close</span>
                    <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                  </Button>
                </div>
                <div className="sm:flex sm:items-start">
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                    <Dialog.Title
                      as="h3"
                      className="text-lg leading-6 font-medium text-foreground"
                    >
                      Edit Client
                    </Dialog.Title>
                    <div className="mt-2 space-y-4">
                      <div className="space-y-2">
                        <Label className="text-sm text-foreground">
                          Client name
                        </Label>
                        <Input
                          type="text"
                          className="bg-background/60"
                          placeholder="Enter client name here..."
                          name="name"
                          onChange={(e) => setName(e.target.value)}
                          value={name}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm text-foreground">Email</Label>
                        <Input
                          type="email"
                          className="bg-background/60"
                          placeholder="Enter email here...."
                          onChange={(e) => setEmail(e.target.value)}
                          value={email}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm text-foreground">
                          Contact method
                        </Label>
                        <Input
                          type="text"
                          className="bg-background/60"
                          placeholder="Enter preferred contact method (e.g. phone, Discord, etc.)..."
                          onChange={(e) => setContactMethod(e.target.value)}
                          value={contactMethod}
                        />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                  <Button
                    type="button"
                    onClick={() => {
                      updateClient();
                      router.reload(router.pathname);
                    }}
                  >
                    Update
                  </Button>
                </div>
              </div>
            </Transition.Child>
          </div>
        </Dialog>
      </Transition.Root>
    </div>
  );
}
