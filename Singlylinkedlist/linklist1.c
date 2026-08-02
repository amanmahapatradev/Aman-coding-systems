#include <stdio.h>
#include <stdlib.h>

struct node{
    int data;
    struct node * link;
};

int main(void) {
    struct node * head = NULL;
    head = (struct node*)malloc(sizeof(struct node));
    head -> data = 1;
    head -> link = NULL;

    struct node * curr = NULL;
    curr = (struct node*) malloc(sizeof(struct node));
    curr -> data = 2;
    curr -> link = NULL;
    head-> link = curr;

    struct node * curr = NULL;
    curr = (struct node*) malloc(sizeof(struct node));
    curr -> data = 2;
    curr -> link = NULL;
    head-> link -> link = curr;

    printf("%d",head -> link);
    return 0;
}
